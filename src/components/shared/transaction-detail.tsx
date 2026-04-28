import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, FileText, ArrowLeft, ArrowRight, Pin, PinOff } from 'lucide-react';
import { CopyButton } from '@/components/shared/copy-button';
import { InfoRow } from '@/components/shared/info-row';
import { MoneyDisplay } from '@/components/shared/money-display';
import { AssetAmountDisplay } from '@/components/shared/asset-amount-display';
import { AssetBadge } from '@/components/shared/asset-badge';
import { BadgeStatus, BadgeRecoverable, deriveVtxoStatus, isRecoverable } from '@/components/shared/badge-status';
import { truncateHash, formatTimestamp } from '@/lib/utils';
import { constructArkAddress } from '@/lib/arkAddress';
import { indexerClient } from '@/lib/api/indexer';
import { fetchAllPages } from '@/lib/api/fetchAllPages';
import { useServerInfo } from '@/providers/server-info-provider';
import { useRecentSearches } from '@/hooks/use-recent-searches';
import * as btc from '@scure/btc-signer';
import { hex } from '@scure/base';
import { CosignerPublicKey, getArkPsbtFields, asset } from '@arkade-os/sdk';
import type { CommitmentTx, VirtualCoin } from '@arkade-os/sdk';

const { Packet } = asset;

// ---------------------------------------------------------------------------
// PSBT / Script helpers
// ---------------------------------------------------------------------------

/** Check if a script is an ARK extension OP_RETURN */
function isArkExtension(script: Uint8Array): boolean {
  try {
    const decoded = btc.Script.decode(script);
    if (decoded.length < 2 || decoded[0] !== 'RETURN') return false;
    const data = decoded[1];
    if (!(data instanceof Uint8Array)) return false;
    return data.length >= 3 && data[0] === 0x41 && data[1] === 0x52 && data[2] === 0x4b;
  } catch {
    return false;
  }
}

/** Known ARK packet extension type IDs */
const EXTENSION_NAMES: Record<number, string> = {
  0: 'Asset',
};

interface ParsedPacket {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assetPacket: any;
  extensions: Array<{ type: number; name: string }>;
}

/** Parse ARK packet from an OP_RETURN script, returning all detected extensions */
function parseArkPacket(script: Uint8Array): ParsedPacket | null {
  try {
    const decoded = btc.Script.decode(script);
    if (decoded.length < 2 || decoded[0] !== 'RETURN') return null;
    const pushes = decoded.slice(1).filter((x): x is Uint8Array => x instanceof Uint8Array);
    if (pushes.length === 0) return null;
    const totalLen = pushes.reduce((sum, p) => sum + p.length, 0);
    const buf = new Uint8Array(totalLen);
    let offset = 0;
    for (const p of pushes) {
      buf.set(p, offset);
      offset += p.length;
    }
    if (buf.length < 3 || buf[0] !== 0x41 || buf[1] !== 0x52 || buf[2] !== 0x4b) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let assetPacket: any = null;
    const extensions: Array<{ type: number; name: string }> = [];
    let pos = 3;
    while (pos < buf.length) {
      const packetType = buf[pos++];
      let len = 0,
        shift = 0;
      while (pos < buf.length) {
        const b = buf[pos++];
        len |= (b & 0x7f) << shift;
        if ((b & 0x80) === 0) break;
        shift += 7;
      }
      const data = buf.slice(pos, pos + len);
      pos += len;
      extensions.push({ type: packetType, name: EXTENSION_NAMES[packetType] || `Extension #${packetType}` });
      if (packetType === 0) {
        assetPacket = Packet.fromBytes(data);
      }
    }
    if (extensions.length === 0) return null;
    return { assetPacket, extensions };
  } catch {
    return null;
  }
}

/** Convert a Uint8Array to lowercase hex string */
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ArkadeTxData {
  txid: string;
  hex: string;
}

interface CommitmentTxData {
  txid: string;
  metadata: CommitmentTx;
  hex: string;
  forfeitTxids: string[];
  connectors: Array<{ txid: string; children: Record<number, string> }>;
}

interface TransactionDetailProps {
  type: 'arkade' | 'commitment';
  arkadeData?: ArkadeTxData;
  commitmentData?: CommitmentTxData;
  vtxoData?: VirtualCoin[];
}

// ---------------------------------------------------------------------------
// Parsed transaction data types
// ---------------------------------------------------------------------------

interface ParsedInput {
  index: number;
  txid: string;
  vout: number;
  amount: bigint | null;
  scriptHex: string;
  arkAddress: string;
}

interface ParsedOutput {
  index: number;
  amount: bigint;
  scriptHex: string;
  isAnchor: boolean;
  isArkExtension: boolean;
  isForfeit: boolean;
  arkAddress: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vtxo: any;
  isBatch: boolean;
  batchKey: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  batchInfo: any;
}

type TxSubtype = 'generic' | 'forfeit' | 'checkpoint' | 'batch-tree' | 'connector-tree';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const CARD_SHADOW =
  'shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_-1px_hsl(var(--border)/0.3),0_2px_4px_hsl(var(--border)/0.2)]';

function TxTypeBadge({ label, variant }: { label: string; variant: 'blue' | 'purple' | 'amber' | 'emerald' | 'orange' }) {
  const styles: Record<string, string> = {
    blue: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
    purple: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
    amber: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    emerald: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    orange: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border ${styles[variant]}`}>
      {label}
    </span>
  );
}

function subtypeBadge(subtype: TxSubtype) {
  switch (subtype) {
    case 'forfeit':
      return <TxTypeBadge label="Forfeit tx" variant="orange" />;
    case 'checkpoint':
      return <TxTypeBadge label="Checkpoint tx" variant="emerald" />;
    case 'batch-tree':
      return <TxTypeBadge label="Batch tree tx" variant="amber" />;
    case 'connector-tree':
      return <TxTypeBadge label="Connector tree tx" variant="purple" />;
    default:
      return null;
  }
}

function HexViewer({ hex: hexStr, label }: { hex: string; label: string }) {
  const [expanded, setExpanded] = useState(false);
  const preview = hexStr.slice(0, 120);
  const isLong = hexStr.length > 120;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
        <CopyButton text={hexStr} />
      </div>
      <div className="rounded-lg bg-secondary/50 border border-border p-3 overflow-x-auto">
        <code className="text-xs font-mono text-foreground break-all leading-relaxed">
          {expanded ? hexStr : preview}
          {isLong && !expanded && '...'}
        </code>
      </div>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? 'Show less hex data' : 'Show all hex data'}
          className="text-xs text-primary hover:text-primary/80 transition-colors duration-200 active:scale-[0.97]"
        >
          {expanded ? 'Show less' : `Show all (${hexStr.length} chars)`}
        </button>
      )}
    </div>
  );
}

function ForfeitTxList({ txids }: { txids: string[] }) {
  const [expanded, setExpanded] = useState(false);

  if (txids.length === 0) {
    return <span className="text-sm text-muted-foreground">None</span>;
  }

  const visible = expanded ? txids : txids.slice(0, 5);

  return (
    <div className="space-y-1.5">
      {visible.map((txid) => (
        <div key={txid} className="flex items-center gap-2">
          <Link
            to={`/tx/${txid}`}
            className="text-xs font-mono text-primary hover:text-primary/80 transition-colors duration-200 truncate"
            aria-label={`View forfeit transaction ${truncateHash(txid, 8, 8)}`}
          >
            {truncateHash(txid, 12, 12)}
          </Link>
          <CopyButton text={txid} />
        </div>
      ))}
      {txids.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? 'Show fewer forfeit transactions' : `Show all ${txids.length} forfeit transactions`}
          className="text-xs text-primary hover:text-primary/80 transition-colors duration-200 active:scale-[0.97]"
        >
          {expanded ? 'Show less' : `Show all ${txids.length} forfeit txs`}
        </button>
      )}
    </div>
  );
}

function ConnectorList({ connectors }: { connectors: Array<{ txid: string; children: Record<number, string> }> }) {
  const [expanded, setExpanded] = useState(false);

  if (connectors.length === 0) {
    return <span className="text-sm text-muted-foreground">None</span>;
  }

  const visible = expanded ? connectors : connectors.slice(0, 5);

  return (
    <div className="space-y-2">
      {visible.map((conn) => (
        <div key={conn.txid} className="flex items-start gap-2">
          <Link
            to={`/tx/${conn.txid}`}
            className="text-xs font-mono text-primary hover:text-primary/80 transition-colors duration-200 shrink-0"
            aria-label={`View connector ${truncateHash(conn.txid, 8, 8)}`}
          >
            {truncateHash(conn.txid, 12, 12)}
          </Link>
          <CopyButton text={conn.txid} />
          {Object.keys(conn.children).length > 0 && (
            <span className="text-xs text-muted-foreground">
              ({Object.keys(conn.children).length} children)
            </span>
          )}
        </div>
      ))}
      {connectors.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? 'Show fewer connectors' : `Show all ${connectors.length} connectors`}
          className="text-xs text-primary hover:text-primary/80 transition-colors duration-200 active:scale-[0.97]"
        >
          {expanded ? 'Show less' : `Show all ${connectors.length} connectors`}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Input card
// ---------------------------------------------------------------------------

function InputCard({
  input,
  assetPacket,
  txid,
}: {
  input: ParsedInput;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assetPacket?: any;
  txid?: string;
}) {
  // Derive asset information from packet for this input
  const inputAssets: Array<{ assetId: string; amount: number }> = [];
  if (assetPacket) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assetPacket.groups?.forEach((g: any, gi: number) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inp = g.inputs?.find((i: any) => i.vin === input.index);
      if (!inp) return;
      const aid =
        g.assetId?.toString() ||
        (g.isIssuance?.() && txid ? txid + gi.toString(16).padStart(4, '0') : null);
      if (aid) inputAssets.push({ assetId: aid, amount: Number(inp.amount) });
    });
  }

  return (
    <div className="flex items-center gap-2">
      <div className="w-7 flex items-center justify-center shrink-0">
        {input.txid && (
          <Link
            to={`/tx/${input.txid}`}
            className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground hover:bg-primary/80 transition-colors duration-200 active:scale-[0.97]"
            aria-label={`Go to input transaction ${truncateHash(input.txid, 6, 6)}`}
          >
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>
      <div
        className={`flex-1 min-w-0 rounded-lg border border-border bg-card p-3 ${CARD_SHADOW}`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground font-medium">
            Input #{input.index}
          </span>
          {input.amount !== null && (
            <MoneyDisplay
              sats={Number(input.amount)}
              className="text-xs font-semibold text-foreground"
            />
          )}
        </div>
        {/* Asset amounts */}
        {inputAssets.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            {inputAssets.map((a, ai) => (
              <AssetAmountDisplay
                key={ai}
                amount={a.amount}
                assetId={a.assetId}
                valueClassName="text-xs font-semibold text-foreground"
                unitClassName="text-xs"
              />
            ))}
          </div>
        )}
        {input.arkAddress ? (
          <Link
            to={`/address/${input.arkAddress}`}
            className="text-xs font-mono text-primary hover:text-primary/80 transition-colors duration-200 flex items-center gap-1"
            aria-label={`View address ${truncateHash(input.arkAddress, 8, 8)}`}
          >
            <span>{truncateHash(input.arkAddress, 12, 12)}</span>
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        ) : input.txid ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono text-muted-foreground break-all">
              {truncateHash(input.txid, 12, 12)}:{input.vout}
            </span>
            <CopyButton text={`${input.txid}:${input.vout}`} />
          </div>
        ) : input.scriptHex ? (
          <div className="text-xs font-mono text-muted-foreground break-all">
            {input.scriptHex.substring(0, 40)}...
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Output card
// ---------------------------------------------------------------------------

function OutputCard({
  output,
  txid,
  forfeitAddress,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assetPacket,
  isConnector,
  batchRootTxid,
  forfeitVtxo,
  checkpointVtxo,
}: {
  output: ParsedOutput;
  txid: string;
  subtype: TxSubtype;
  forfeitAddress: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assetPacket: any;
  isConnector?: boolean;
  batchRootTxid?: string;
  forfeitVtxo?: VirtualCoin | null;
  checkpointVtxo?: VirtualCoin | null;
}) {
  // For checkpoint/forfeit txs, use the fetched VTXO from the input instead of
  // per-output vtxo lookup (checkpoint/forfeit outputs aren't individual VTXOs)
  const effectiveVtxo =
    (checkpointVtxo && !output.isAnchor) ? checkpointVtxo :
    (forfeitVtxo && output.isForfeit) ? forfeitVtxo :
    output.vtxo;
  const vtxo = effectiveVtxo;
  const vtxoStatus = vtxo ? deriveVtxoStatus(vtxo) : undefined;
  const isSpent =
    vtxo?.isSpent === true || (vtxo?.spentBy && vtxo.spentBy !== '');
  const spendingTxid =
    (checkpointVtxo && !output.isAnchor && checkpointVtxo.arkTxId)
      ? checkpointVtxo.arkTxId
      : vtxo?.spentBy && vtxo.spentBy !== ''
        ? vtxo.spentBy
        : vtxo?.settledBy && vtxo.settledBy !== ''
          ? vtxo.settledBy
          : vtxo?.arkTxId && vtxo.arkTxId !== ''
            ? vtxo.arkTxId
            : null;

  // Border accent for special outputs
  const borderAccent = output.isBatch
    ? 'border-l-amber-500 border-l-2'
    : output.isForfeit
      ? 'border-l-orange-500 border-l-2'
      : '';

  // Derive asset information from vtxo or packet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const outputAssets: Array<{ assetId: string; amount: number }> = [];
  if (!output.isAnchor && !output.isArkExtension) {
    if (vtxo?.assets && vtxo.assets.length > 0) {
      vtxo.assets.forEach((a: { assetId: string; amount: number }) =>
        outputAssets.push(a),
      );
    } else if (assetPacket) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assetPacket.groups?.forEach((g: any, gi: number) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const out = g.outputs?.find((o: any) => o.vout === output.index);
        if (!out) return;
        const aid =
          g.assetId?.toString() ||
          (g.isIssuance?.() ? txid + gi.toString(16).padStart(4, '0') : null);
        if (aid) outputAssets.push({ assetId: aid, amount: Number(out.amount) });
      });
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex-1 min-w-0 rounded-lg border border-border bg-card p-3 ${CARD_SHADOW} ${borderAccent}`}
      >
        {/* Header row */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-medium">
              Output #{output.index}
            </span>
            {output.isAnchor && (
              <span className="text-xs text-muted-foreground">Anchor</span>
            )}
            {output.isArkExtension && (
              <span className="text-xs text-muted-foreground">OP_RETURN</span>
            )}
            {output.isForfeit && (
              <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                Forfeit
              </span>
            )}
            {output.isBatch && output.batchInfo && (
              <Link
                to={batchRootTxid ? `/tx/${batchRootTxid}` : `#batch-${output.batchKey}`}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-semibold rounded-full border bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/25 transition-colors duration-150"
                aria-label={`View batch ${parseInt(output.batchKey) + 1} details`}
                title={batchRootTxid ? `View batch root tx: ${batchRootTxid}` : undefined}
              >
                Batch #{parseInt(output.batchKey) + 1}
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            )}
            {outputAssets.length > 0 && (
              <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-semibold rounded-full border bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30">
                Asset
              </span>
            )}
            {isConnector && (
              <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-semibold rounded-full border bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30">
                Connector
              </span>
            )}
          </div>
          <MoneyDisplay
            sats={Number(output.amount)}
            className="text-xs font-semibold text-foreground"
          />
        </div>
        {/* Status badges */}
        {vtxo && !output.isAnchor && (
          <div className="flex items-center gap-1.5 mb-1">
            <BadgeStatus status={vtxoStatus!} />
            {isRecoverable(vtxo) && vtxoStatus !== 'spent' && <BadgeRecoverable />}
          </div>
        )}

        {/* Batch VTXO count */}
        {output.isBatch && output.batchInfo && (
          <div className="text-xs text-muted-foreground mb-1">
            {output.batchInfo.totalOutputVtxos} VTXO
            {output.batchInfo.totalOutputVtxos !== 1 ? 's' : ''}
          </div>
        )}

        {/* Asset amounts */}
        {outputAssets.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            {outputAssets.map((a, ai) => (
              <AssetAmountDisplay
                key={ai}
                amount={a.amount}
                assetId={a.assetId}
                valueClassName="text-xs font-semibold text-foreground"
                unitClassName="text-xs"
              />
            ))}
          </div>
        )}

        {/* Script / address */}
        {output.isForfeit ? (
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-orange-600 dark:text-orange-400">
              Arkade operator
            </div>
            {forfeitAddress && (
              <div className="text-xs font-mono text-muted-foreground break-all">
                {forfeitAddress}
              </div>
            )}
            {forfeitVtxo?.settledBy && (
              <div className="text-xs text-muted-foreground">
                Settled in{' '}
                <Link
                  to={`/commitment-tx/${forfeitVtxo.settledBy}`}
                  className="text-primary hover:text-primary/80 font-mono"
                >
                  {truncateHash(forfeitVtxo.settledBy, 8, 8)}
                </Link>
              </div>
            )}
          </div>
        ) : output.arkAddress ? (
          <div className="flex items-center gap-1.5">
            <Link
              to={`/address/${output.arkAddress}`}
              className="text-xs font-mono text-primary hover:text-primary/80 transition-colors duration-200 flex items-center gap-1"
              aria-label={`View address ${truncateHash(output.arkAddress, 8, 8)}`}
            >
              <span>{truncateHash(output.arkAddress, 12, 12)}</span>
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
            <CopyButton text={output.arkAddress} />
          </div>
        ) : output.isArkExtension ? (
          <div className="text-xs font-mono text-muted-foreground break-all">
            Packet &middot; {output.scriptHex.substring(0, 40)}...
          </div>
        ) : output.isAnchor ? (
          <div className="text-xs font-mono text-muted-foreground break-all">
            {output.scriptHex.substring(0, 40)}...
          </div>
        ) : output.scriptHex ? (
          <div className="flex items-center gap-1.5">
            <Link
              to={`/address/${output.scriptHex}`}
              className="text-xs font-mono text-primary hover:text-primary/80 transition-colors duration-200 break-all"
              aria-label={`View script ${output.scriptHex.substring(0, 16)}...`}
            >
              {output.scriptHex.substring(0, 40)}...
            </Link>
            <CopyButton text={output.scriptHex} />
          </div>
        ) : null}
      </div>

      {/* Spending arrow */}
      <div className="w-7 flex items-center justify-center shrink-0">
        {isSpent && spendingTxid && (
          <Link
            to={`/tx/${spendingTxid}`}
            className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground hover:bg-primary/80 transition-colors duration-200 active:scale-[0.97]"
            aria-label={`View spending transaction ${truncateHash(spendingTxid, 6, 6)}`}
          >
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Asset packet section
// ---------------------------------------------------------------------------

function PacketSection({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assetPacket,
  txid,
  extensions,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assetPacket: any;
  txid: string;
  extensions: Array<{ type: number; name: string }>;
}) {
  const hasAssetGroups = assetPacket?.groups?.length > 0;
  if (!hasAssetGroups && extensions.length === 0) return null;

  return (
    <div className={`rounded-xl border border-border bg-card p-6 ${CARD_SHADOW}`}>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-sm font-semibold text-foreground">Packet</h2>
        {extensions.map((ext, i) => (
          <span
            key={i}
            className="inline-flex items-center px-1.5 py-0.5 text-xs font-semibold rounded-full border bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
          >
            {ext.name}
          </span>
        ))}
      </div>
      <div className="space-y-3">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {assetPacket.groups.map((group: any, gi: number) => {
          const isIssuance = group.isIssuance?.();
          const assetIdStr =
            group.assetId?.toString() ||
            (isIssuance ? txid + gi.toString(16).padStart(4, '0') : 'Unknown');

          return (
            <div
              key={gi}
              className={`rounded-lg border border-border bg-secondary/30 p-3 space-y-2 ${CARD_SHADOW}`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <AssetBadge assetId={assetIdStr} />
                <CopyButton text={assetIdStr} />
                {isIssuance && (
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                    Issuance
                  </span>
                )}
              </div>

              {group.inputs?.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground font-medium">
                    Inputs
                  </span>
                  <div className="ml-2 space-y-0.5 mt-0.5">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {group.inputs.map((inp: any, ii: number) => (
                      <div
                        key={ii}
                        className="text-xs font-mono text-muted-foreground flex items-center gap-1"
                      >
                        <span>vin:{inp.vin} &rarr;</span>{' '}
                        <AssetAmountDisplay
                          amount={Number(inp.amount)}
                          assetId={assetIdStr}
                          valueClassName="text-foreground font-semibold text-xs"
                          unitClassName="text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {group.outputs?.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground font-medium">
                    Outputs
                  </span>
                  <div className="ml-2 space-y-0.5 mt-0.5">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {group.outputs.map((out: any, oi: number) => (
                      <div
                        key={oi}
                        className="text-xs font-mono text-muted-foreground flex items-center gap-1"
                      >
                        <span>vout:{out.vout} &rarr;</span>{' '}
                        <AssetAmountDisplay
                          amount={Number(out.amount)}
                          assetId={assetIdStr}
                          valueClassName="text-foreground font-semibold text-xs"
                          unitClassName="text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TransactionDetail({
  type,
  arkadeData,
  commitmentData,
  vtxoData,
}: TransactionDetailProps) {
  const txid = (type === 'arkade' ? arkadeData?.txid : commitmentData?.txid) || '';
  const { serverInfo } = useServerInfo();
  const { isPinned, pinSearch, unpinSearch } = useRecentSearches();

  const pinned = txid ? isPinned(txid) : false;
  const handleTogglePin = () => {
    if (!txid) return;
    if (pinned) {
      unpinSearch(txid);
    } else {
      pinSearch(txid, type === 'commitment' ? 'commitment-tx' : 'transaction');
    }
  };

  // -------------------------------------------------------------------------
  // Parse the transaction
  // -------------------------------------------------------------------------

  const {
    parsedTx,
    subtype,
    inputs,
    outputs,
    assetPacket,
    packetExtensions,
    forfeitAddress,
  } = useMemo(() => {
    let parsed: btc.Transaction | null = null;
    let detectedSubtype: TxSubtype = 'generic';
    let forfeitScriptHex = '';
    let derivedForfeitAddress = '';
    let detectedPacket: ParsedPacket | null = null;

    // --- Parse Arkade transactions from PSBT (base64) ---
    if (type === 'arkade' && arkadeData?.hex) {
      try {
        const psbtBytes = Uint8Array.from(atob(arkadeData.hex), (c) =>
          c.charCodeAt(0),
        );
        parsed = btc.Transaction.fromPSBT(psbtBytes);
      } catch (e) {
        console.error('Failed to parse PSBT:', e);
      }
    }

    // --- Parse Commitment transactions from raw hex ---
    if (type === 'commitment' && commitmentData?.hex) {
      try {
        const txBytes = hex.decode(commitmentData.hex);
        parsed = btc.Transaction.fromRaw(txBytes);
      } catch (e) {
        console.error('Failed to parse commitment transaction hex:', e);
      }
    }

    if (!parsed) {
      return {
        parsedTx: null,
        subtype: 'generic' as TxSubtype,
        inputs: [] as ParsedInput[],
        outputs: [] as ParsedOutput[],
        assetPacket: null,
        packetExtensions: [] as Array<{ type: number; name: string }>,
        forfeitAddress: '',
      };
    }

    // --- Detect forfeit address from server info ---
    if (serverInfo?.forfeitPubkey && parsed) {
      try {
        const pubkeyBytes = Uint8Array.from(
          serverInfo.forfeitPubkey.match(/.{1,2}/g)?.map((byte: string) =>
            parseInt(byte, 16),
          ) || [],
        );
        const net =
          serverInfo.network === 'bitcoin' ? btc.NETWORK : btc.TEST_NETWORK;
        const p2wpkhOutput = btc.p2wpkh(pubkeyBytes, net);
        forfeitScriptHex = toHex(p2wpkhOutput.script);
        derivedForfeitAddress = p2wpkhOutput.address || '';

        // Check if forfeit tx: only 1 non-anchor output going to forfeit address
        let nonAnchorOutputs = 0;
        let forfeitOutputs = 0;
        for (let i = 0; i < parsed.outputsLength; i++) {
          const output = parsed.getOutput(i);
          const scriptH = output?.script ? toHex(output.script) : '';
          const isAnchor = scriptH.startsWith('51024e73');
          if (!isAnchor) {
            nonAnchorOutputs++;
            if (scriptH === forfeitScriptHex) forfeitOutputs++;
          }
        }
        if (nonAnchorOutputs === 1 && forfeitOutputs === 1) {
          detectedSubtype = 'forfeit';
        }
      } catch (e) {
        console.error('Failed to generate forfeit script:', e);
      }
    }

    // --- Detect checkpoint tx ---
    if (
      detectedSubtype === 'generic' &&
      parsed &&
      serverInfo?.checkpointTapscript
    ) {
      try {
        let nonAnchorCount = 0;
        let nonAnchorOutput: ReturnType<btc.Transaction['getOutput']> | undefined;
        for (let i = 0; i < parsed.outputsLength; i++) {
          const output = parsed.getOutput(i);
          const scriptH = output?.script ? toHex(output.script) : '';
          if (!scriptH.startsWith('51024e73')) {
            nonAnchorCount++;
            nonAnchorOutput = output;
          }
        }
        if (parsed.inputsLength === 1 && nonAnchorCount === 1) {
          if (nonAnchorOutput?.tapTree && nonAnchorOutput.tapTree.length > 0) {
            const checkpointTapscript = hex.decode(serverInfo.checkpointTapscript);
            for (const tree of nonAnchorOutput.tapTree) {
              const match =
                ArrayBuffer.isView(checkpointTapscript) &&
                ArrayBuffer.isView(tree.script) &&
                checkpointTapscript.byteLength === tree.script.byteLength &&
                new Uint8Array(checkpointTapscript).every(
                  (val, i) => val === new Uint8Array(tree.script)[i],
                );
              if (match) {
                detectedSubtype = 'checkpoint';
                break;
              }
            }
          }
        }
      } catch (e) {
        console.error('Failed to detect checkpoint tx:', e);
      }
    }

    // --- Detect batch tree vs connector tree ---
    if (detectedSubtype === 'generic' && parsed) {
      try {
        const cosignerFields = getArkPsbtFields(
          parsed,
          0,
          CosignerPublicKey,
        );
        if (cosignerFields.length > 1) {
          detectedSubtype = 'batch-tree';
        } else if (cosignerFields.length === 1) {
          const cosignerPubkey = cosignerFields[0].key.slice(1);
          const nonAnchorOutput = parsed.getOutput(0);
          if (nonAnchorOutput?.script) {
            const decodedOutput = btc.OutScript.decode(nonAnchorOutput.script);
            if (
              'pubkey' in decodedOutput &&
              decodedOutput.pubkey &&
              ArrayBuffer.isView(cosignerPubkey) &&
              ArrayBuffer.isView(decodedOutput.pubkey) &&
              cosignerPubkey.byteLength === decodedOutput.pubkey.byteLength &&
              new Uint8Array(cosignerPubkey).every(
                (val, i) => val === new Uint8Array(decodedOutput.pubkey!)[i],
              )
            ) {
              detectedSubtype = 'connector-tree';
            }
          }
        }
      } catch (e) {
        console.error('Failed to detect tree transaction type:', e);
      }
    }

    // --- Parse asset packet from OP_RETURN ---
    for (let i = 0; i < parsed.outputsLength; i++) {
      const output = parsed.getOutput(i);
      if (output?.script && isArkExtension(output.script)) {
        detectedPacket = parseArkPacket(output.script);
        break;
      }
    }

    // --- Build parsed inputs ---
    const parsedInputs: ParsedInput[] = [];
    for (let i = 0; i < parsed.inputsLength; i++) {
      const input = parsed.getInput(i);
      const inputTxid = input?.txid ? toHex(input.txid) : '';
      let inputAmount: bigint | null = null;
      let inputScriptHex = '';
      let inputArkAddress = '';

      if (input?.witnessUtxo) {
        inputAmount = input.witnessUtxo.amount;
        if (input.witnessUtxo.script) {
          inputScriptHex = hex.encode(input.witnessUtxo.script);
        }
        // Show Ark addresses only for batch tree transactions
        if (
          detectedSubtype === 'batch-tree' &&
          input.witnessUtxo.script &&
          serverInfo?.signerPubkey &&
          serverInfo?.network
        ) {
          try {
            const addr = constructArkAddress(
              input.witnessUtxo.script,
              serverInfo.signerPubkey,
              serverInfo.network,
            );
            if (addr) inputArkAddress = addr;
          } catch (e) {
            console.error('Failed to construct Ark address for input:', e);
          }
        }
      }

      parsedInputs.push({
        index: i,
        txid: inputTxid,
        vout: input?.index ?? 0,
        amount: inputAmount,
        scriptHex: inputScriptHex,
        arkAddress: inputArkAddress,
      });
    }

    // --- Build parsed outputs ---
    const parsedOutputs: ParsedOutput[] = [];
    for (let i = 0; i < parsed.outputsLength; i++) {
      const output = parsed.getOutput(i);
      const amount = output?.amount || BigInt(0);
      const scriptH = output?.script ? toHex(output.script) : '';
      const isAnchor = scriptH.startsWith('51024e73');
      const isExt = output?.script ? isArkExtension(output.script) : false;
      const isForfeitOutput =
        detectedSubtype === 'forfeit' && scriptH === forfeitScriptHex;

      // Find the matching VTXO for this output
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vtxo = vtxoData?.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (v: any) => (v.outpoint?.vout ?? v.vout) === i,
      );

      // Try to construct Ark address
      let arkAddress = '';
      if (
        !isAnchor &&
        !isForfeitOutput &&
        detectedSubtype !== 'checkpoint' &&
        detectedSubtype !== 'connector-tree' &&
        output?.script &&
        serverInfo?.signerPubkey &&
        serverInfo?.network
      ) {
        try {
          const addr = constructArkAddress(
            output.script,
            serverInfo.signerPubkey,
            serverInfo.network,
          );
          if (addr) arkAddress = addr;
        } catch (e) {
          console.error('Failed to construct Ark address:', e);
        }
      }

      // Check if this output is a batch
      const batchKey = i.toString();
      const batchInfo =
        type === 'commitment'
          ? commitmentData?.metadata?.batches?.[batchKey]
          : null;
      const isBatch =
        !!batchInfo && parseInt((batchInfo as any).totalOutputAmount || '0') > 0;

      parsedOutputs.push({
        index: i,
        amount,
        scriptHex: scriptH,
        isAnchor,
        isArkExtension: isExt,
        isForfeit: isForfeitOutput,
        arkAddress,
        vtxo,
        isBatch,
        batchKey,
        batchInfo,
      });
    }

    return {
      parsedTx: parsed,
      subtype: detectedSubtype,
      inputs: parsedInputs,
      outputs: parsedOutputs,
      assetPacket: detectedPacket?.assetPacket ?? null,
      packetExtensions: detectedPacket?.extensions ?? [],
      forfeitAddress: derivedForfeitAddress,
    };
  }, [type, arkadeData?.hex, commitmentData?.hex, serverInfo, vtxoData, commitmentData?.metadata, txid]);

  // -------------------------------------------------------------------------
  // Fetch VTXO tree data for each batch (commitment txs only)
  // -------------------------------------------------------------------------

  const batchVouts = type === 'commitment' && commitmentData?.metadata?.batches
    ? Object.keys(commitmentData.metadata.batches).map(key => parseInt(key))
    : [];

  const batchTreeQueries = useQueries({
    queries: batchVouts.map(vout => ({
      queryKey: ['vtxo-tree', txid, vout],
      queryFn: () => fetchAllPages(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (opts: any) => indexerClient.getVtxoTree({ txid, vout }, opts),
        'vtxoTree',
      ),
      enabled: type === 'commitment' && !!txid,
    })),
  });

  const batchRootTxids = new Map<number, string>();
  batchTreeQueries.forEach((query, index) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((query.data as any)?.vtxoTree && (query.data as any).vtxoTree.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tree = (query.data as any).vtxoTree;
      const allChildTxids = new Set<string>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tree.forEach((node: any) => {
        if (node.children) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Object.values(node.children).forEach((childTxid: any) => {
            allChildTxids.add(childTxid);
          });
        }
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rootNode = tree.find((node: any) => !allChildTxids.has(node.txid));
      if (rootNode) {
        batchRootTxids.set(batchVouts[index], rootNode.txid);
      }
    }
  });

  // -------------------------------------------------------------------------
  // Find root connector transaction and determine connector outputs
  // -------------------------------------------------------------------------

  const rootConnectorTxid = type === 'commitment' && commitmentData?.connectors?.length
    ? (() => {
        const connectors = commitmentData.connectors;
        const allChildTxids = new Set<string>();
        connectors.forEach((conn) => {
          if (conn.children) {
            Object.values(conn.children).forEach((childTxid) => {
              allChildTxids.add(childTxid);
            });
          }
        });
        const rootConnector = connectors.find((conn) => !allChildTxids.has(conn.txid));
        return rootConnector?.txid;
      })()
    : null;

  const rootConnectorQueries = useQueries({
    queries: [{
      queryKey: ['virtual-tx', rootConnectorTxid || 'none'],
      queryFn: async () => {
        if (!rootConnectorTxid) return null;
        const result = await indexerClient.getVirtualTxs([rootConnectorTxid]);
        return result.txs[0];
      },
      enabled: !!rootConnectorTxid,
    }],
  });

  const connectorOutputIndices = useMemo(() => {
    const indices = new Set<number>();
    const rootConnectorData = rootConnectorQueries[0]?.data;
    if (rootConnectorData && typeof rootConnectorData === 'string') {
      try {
        const isHexData = /^[0-9a-fA-F]+$/.test(rootConnectorData);
        let rootConnectorParsedTx: btc.Transaction | null = null;

        if (isHexData) {
          const txBytes = hex.decode(rootConnectorData);
          rootConnectorParsedTx = btc.Transaction.fromRaw(txBytes);
        } else {
          const psbtBytes = Uint8Array.from(atob(rootConnectorData), c => c.charCodeAt(0));
          rootConnectorParsedTx = btc.Transaction.fromPSBT(psbtBytes);
        }

        if (rootConnectorParsedTx) {
          for (let i = 0; i < rootConnectorParsedTx.inputsLength; i++) {
            const input = rootConnectorParsedTx.getInput(i);
            if (input?.txid) {
              const inputTxid = toHex(input.txid);
              if (inputTxid === txid) {
                indices.add(input.index ?? 0);
              }
            }
          }
        }
      } catch (e) {
        console.error('Failed to parse root connector transaction:', e);
      }
    }
    return indices;
  }, [rootConnectorQueries, txid]);

  // -------------------------------------------------------------------------
  // Fetch forfeit VTXO data (for forfeit transactions)
  // -------------------------------------------------------------------------

  const [forfeitVtxo, setForfeitVtxo] = useState<VirtualCoin | null>(null);

  useEffect(() => {
    if (subtype !== 'forfeit' || !parsedTx || parsedTx.inputsLength === 0) return;

    const input = parsedTx.getInput(0);
    if (!input?.txid || input?.index === undefined) return;

    const inputTxid = toHex(input.txid);
    indexerClient
      .getVtxos({ outpoints: [{ txid: inputTxid, vout: input.index }] })
      .then((result) => {
        if (result.vtxos?.[0]) setForfeitVtxo(result.vtxos[0]);
      })
      .catch((err) => {
        console.error('Failed to fetch forfeit VTXO:', err);
      });
  }, [subtype, parsedTx]);

  // -------------------------------------------------------------------------
  // Fetch checkpoint VTXO data (for checkpoint transactions)
  // -------------------------------------------------------------------------

  const [checkpointVtxo, setCheckpointVtxo] = useState<VirtualCoin | null>(null);

  useEffect(() => {
    if (subtype !== 'checkpoint' || !parsedTx || parsedTx.inputsLength === 0) return;

    const input = parsedTx.getInput(0);
    if (!input?.txid || input?.index === undefined) return;

    const inputTxid = toHex(input.txid);
    indexerClient
      .getVtxos({ outpoints: [{ txid: inputTxid, vout: input.index }] })
      .then((result) => {
        if (result.vtxos?.[0]) setCheckpointVtxo(result.vtxos[0]);
      })
      .catch((err) => {
        console.error('Failed to fetch checkpoint VTXO:', err);
      });
  }, [subtype, parsedTx]);

  // -------------------------------------------------------------------------
  // Derive title from subtype
  // -------------------------------------------------------------------------

  const title = useMemo(() => {
    if (type === 'commitment') return 'Commitment transaction';
    switch (subtype) {
      case 'forfeit':
        return 'Forfeit transaction';
      case 'checkpoint':
        return 'Checkpoint transaction';
      case 'batch-tree':
        return 'Batch tree transaction';
      case 'connector-tree':
        return 'Connector tree transaction';
      default:
        return 'Transaction details';
    }
  }, [type, subtype]);

  // -------------------------------------------------------------------------
  // Derive timestamps from vtxoData for Arkade transactions
  // -------------------------------------------------------------------------

  const { earliestCreatedAt, earliestExpiry } = useMemo(() => {
    if (type !== 'arkade' || !vtxoData || vtxoData.length === 0) {
      return { earliestCreatedAt: null, earliestExpiry: null };
    }

    let minCreated: number | null = null;
    let minExpiry: number | null = null;

    for (const vtxo of vtxoData) {
      // createdAt
      if (vtxo.createdAt) {
        const ts = vtxo.createdAt instanceof Date
          ? vtxo.createdAt.getTime()
          : Number(vtxo.createdAt);
        if (!isNaN(ts) && (minCreated === null || ts < minCreated)) {
          minCreated = ts;
        }
      }
      // Expiry from virtualStatus.batchExpiry
      const expiry = vtxo.virtualStatus?.batchExpiry;
      if (expiry) {
        const ts = new Date(expiry).getTime();
        if (!isNaN(ts) && (minExpiry === null || ts < minExpiry)) {
          minExpiry = ts;
        }
      }
    }

    return { earliestCreatedAt: minCreated, earliestExpiry: minExpiry };
  }, [type, vtxoData]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
          aria-label="Back to home"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Home
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm text-foreground">
          {type === 'arkade' ? 'Transaction' : 'Commitment transaction'}
        </span>
      </div>

      {/* Header card */}
      <div className={`rounded-xl border border-border bg-card p-6 ${CARD_SHADOW}`}>
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
          <h1 className="font-heading text-xl font-bold text-foreground">
            {title}
          </h1>
          <TxTypeBadge
            label={type === 'arkade' ? 'Arkade tx' : 'Commitment tx'}
            variant={type === 'arkade' ? 'blue' : 'purple'}
          />
          {type === 'arkade' && subtype !== 'generic' && subtypeBadge(subtype)}
        </div>

        {/* Txid row */}
        {txid && (
          <div className="flex items-center gap-2 mb-6 rounded-lg bg-secondary/50 border border-border px-4 py-3 overflow-x-auto">
            <span className="text-xs text-muted-foreground font-medium shrink-0">
              TXID
            </span>
            <span className="text-xs font-mono text-foreground break-all min-w-0">
              {txid}
            </span>
            <CopyButton text={txid} className="shrink-0" />
            <button
              onClick={handleTogglePin}
              className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors duration-150 active:scale-[0.95]"
              aria-label={pinned ? 'Unpin from search' : 'Pin to search'}
              title={pinned ? 'Unpin from search' : 'Pin to search'}
            >
              {pinned ? (
                <PinOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Pin className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        )}

        {/* Commitment tx metadata */}
        {type === 'commitment' && commitmentData && (
          <div className="space-y-6">
            <dl className="divide-y-0">
              <InfoRow
                label="Started at"
                value={
                  commitmentData.metadata.startedAt
                    ? formatTimestamp(commitmentData.metadata.startedAt)
                    : '--'
                }
              />
              <InfoRow
                label="Ended at"
                value={
                  commitmentData.metadata.endedAt
                    ? formatTimestamp(commitmentData.metadata.endedAt)
                    : '--'
                }
              />
              <InfoRow
                label="Total input amount"
                value={
                  <MoneyDisplay
                    sats={parseInt(
                      commitmentData.metadata.totalInputAmount || '0',
                    )}
                    className="font-semibold"
                  />
                }
              />
              <InfoRow
                label="Total input VTXOs"
                value={
                  commitmentData.metadata.totalInputVtxos?.toLocaleString() ??
                  '0'
                }
              />
              <InfoRow
                label="Total output amount"
                value={
                  <MoneyDisplay
                    sats={parseInt(
                      commitmentData.metadata.totalOutputAmount || '0',
                    )}
                    className="font-semibold"
                  />
                }
              />
              <InfoRow
                label="Total output VTXOs"
                value={
                  commitmentData.metadata.totalOutputVtxos?.toLocaleString() ??
                  '0'
                }
              />
              <InfoRow
                label="Batches"
                value={Object.keys(
                  commitmentData.metadata.batches || {},
                ).length.toString()}
              />
            </dl>

            {/* Forfeit txs */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">
                Forfeit transactions
              </h3>
              <ForfeitTxList txids={commitmentData.forfeitTxids} />
            </div>

            {/* Connectors */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">
                Connectors
              </h3>
              <ConnectorList connectors={commitmentData.connectors} />
            </div>
          </div>
        )}

        {/* Arkade tx timestamps derived from vtxoData */}
        {type === 'arkade' && (earliestCreatedAt || earliestExpiry) && (
          <dl className="divide-y-0 mt-6">
            {earliestCreatedAt && (
              <InfoRow
                label="Created"
                value={formatTimestamp(earliestCreatedAt)}
              />
            )}
            {earliestExpiry && (
              <InfoRow
                label="Expires"
                value={formatTimestamp(earliestExpiry)}
              />
            )}
          </dl>
        )}

        {/* Raw hex viewer (moved after inputs/outputs) */}
        {type === 'arkade' && arkadeData?.hex && !parsedTx && (
          <div className="space-y-6">
            <HexViewer hex={arkadeData.hex} label="Raw virtual transaction" />
          </div>
        )}
        {type === 'commitment' && commitmentData?.hex && !parsedTx && (
          <HexViewer hex={commitmentData.hex} label="Raw transaction" />
        )}
      </div>

      {/* Inputs & Outputs */}
      {parsedTx && (inputs.length > 0 || outputs.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Inputs */}
          <div className={`rounded-xl border border-border bg-card p-5 overflow-x-auto ${CARD_SHADOW}`}>
            <h2 className="text-sm font-semibold text-foreground mb-4">
              Inputs ({inputs.length}
              {type === 'commitment' && commitmentData?.forfeitTxids?.length
                ? ` + ${commitmentData.forfeitTxids.length} forfeit`
                : ''}
              )
            </h2>
            <div className="space-y-2">
              {inputs.map((input) => (
                <InputCard key={`input-${input.index}`} input={input} assetPacket={assetPacket} txid={txid} />
              ))}

              {/* Forfeit transactions as additional inputs (commitment txs) */}
              {type === 'commitment' &&
                commitmentData?.forfeitTxids?.map((fTxid, i) => {
                  const inputIndex = inputs.length + i;
                  return (
                    <div
                      key={`forfeit-input-${i}`}
                      className="flex items-center gap-2"
                    >
                      <div className="w-7 flex items-center justify-center shrink-0">
                        <Link
                          to={`/tx/${fTxid}`}
                          className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground hover:bg-primary/80 transition-colors duration-200 active:scale-[0.97]"
                          aria-label={`View forfeit transaction ${truncateHash(fTxid, 6, 6)}`}
                        >
                          <ArrowRight
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        </Link>
                      </div>
                      <div
                        className={`flex-1 min-w-0 rounded-lg border border-border bg-card p-3 border-l-2 border-l-orange-500 ${CARD_SHADOW}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground font-medium">
                            Input #{inputIndex}
                          </span>
                          <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                            Forfeit
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono text-muted-foreground">
                            {truncateHash(fTxid, 12, 12)}
                          </span>
                          <CopyButton text={fTxid} />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Outputs */}
          <div className={`rounded-xl border border-border bg-card p-5 overflow-x-auto ${CARD_SHADOW}`}>
            <h2 className="text-sm font-semibold text-foreground mb-4">
              Outputs ({outputs.length})
            </h2>
            <div className="space-y-2">
              {outputs.map((output) => (
                <OutputCard
                  key={`output-${output.index}`}
                  output={output}
                  txid={txid}
                  subtype={subtype}
                  forfeitAddress={forfeitAddress}
                  assetPacket={assetPacket}
                  isConnector={connectorOutputIndices.has(output.index)}
                  batchRootTxid={batchRootTxids.get(output.index)}
                  forfeitVtxo={forfeitVtxo}
                  checkpointVtxo={checkpointVtxo}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Packet details */}
      {(assetPacket || packetExtensions.length > 0) && (
        <PacketSection assetPacket={assetPacket} txid={txid} extensions={packetExtensions} />
      )}

      {/* Raw hex (collapsible, shown when parsed tx exists) */}
      {parsedTx && (
        <RawDataSection
          type={type}
          arkadeHex={arkadeData?.hex}
          commitmentHex={commitmentData?.hex}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Raw hex collapsible
// ---------------------------------------------------------------------------

function RawDataSection({
  type,
  arkadeHex,
  commitmentHex,
}: {
  type: 'arkade' | 'commitment';
  arkadeHex?: string;
  commitmentHex?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const rawData = type === 'arkade' ? arkadeHex : commitmentHex;
  if (!rawData) return null;

  const label =
    type === 'arkade' ? 'Raw virtual transaction' : 'Raw transaction';

  return (
    <div className={`rounded-xl border border-border bg-card p-5 ${CARD_SHADOW}`}>
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 active:scale-[0.97]"
          aria-label={expanded ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-expanded={expanded}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          )}
          <span className="font-medium">{label}</span>
          {!expanded && (
            <span className="text-xs text-muted-foreground">({rawData.length} chars)</span>
          )}
        </button>
        <CopyButton text={rawData} />
      </div>
      {expanded && (
        <div className="mt-3 rounded-lg bg-secondary/50 border border-border p-3 overflow-x-auto">
          <code className="text-xs font-mono text-foreground break-all leading-relaxed">
            {rawData}
          </code>
        </div>
      )}
    </div>
  );
}
