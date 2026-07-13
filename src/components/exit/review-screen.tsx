import type { ExitDelay, ExitPackage, ExitVtxoInfo } from '@arkade-os/sdk';
import { ArrowRight, ChevronDown, Clock, Eye, Info, Lock } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { esploraUrlFor } from '@/lib/exit/esplora';
import { cn, truncateHash } from '@/lib/utils';
import { MoneyDisplay } from '@/components/shared/money-display';
import { Tooltip } from '@/components/shared/tooltip';
import { Button, Card, CardTitle } from '@/components/exit/ui';

// ---------------------------------------------------------------------------
// Derivations
// ---------------------------------------------------------------------------

/** A block-based delay is ~10 min/block; a seconds delay is taken as-is. */
function delaySeconds(d: ExitDelay): number {
  return d.type === 'blocks' ? d.value * 600 : d.value;
}

/** Rough end-to-end estimate: unroll + splitter + sweep confirmations, plus
 * the longest CSV timelock any VTXO must wait out. Approximate (~10-min blocks). */
function estimateSeconds(pkg: ExitPackage, active: ExitVtxoInfo[]): number {
  const unrollTxs = pkg.steps.filter((s) => s.kind === 'package' || s.kind === 'bump').length;
  const splitter = pkg.steps.some((s) => s.kind === 'broadcast') ? 1 : 0;
  const confirmBlocks = unrollTxs + splitter + 1; // + the final sweep
  const maxDelay = active.reduce((m, v) => (v.delay ? Math.max(m, delaySeconds(v.delay)) : m), 0);
  return confirmBlocks * 600 + maxDelay;
}

function formatDuration(sec: number): string {
  if (sec < 60) return '<1 min';
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `~${d}d ${h}h`;
  if (h > 0) return `~${h}h ${m}m`;
  return `~${m}m`;
}

/** Friendly label for a `${contractType}:${pathHint}` exit path. */
function pathLabel(path?: string): string {
  if (!path) return 'exit path';
  if (path.startsWith('vhtlc')) return 'VHTLC claim';
  if (path.startsWith('default')) return 'unilateral exit';
  return path;
}

function delayLabel(d: ExitDelay): string {
  if (d.type === 'blocks') return `${d.value}-block timelock`;
  const mins = Math.round(d.value / 60);
  return `~${mins}-min timelock`;
}

// ---------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------

function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="font-mono text-lg text-foreground tabular-nums">{value}</span>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

function Warning({
  tone,
  icon,
  title,
  children,
}: {
  tone: 'warn' | 'danger';
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-lg border p-3 text-sm',
        tone === 'danger'
          ? 'border-destructive/30 bg-destructive/10 text-destructive'
          : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
      )}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 text-xs opacity-90">{children}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function ReviewScreen({
  pkg,
  onContinue,
}: {
  pkg: ExitPackage;
  onContinue: (esploraUrl: string) => void;
}) {
  const [esplora, setEsplora] = useState(() => esploraUrlFor(pkg.network));
  const [showAdvanced, setShowAdvanced] = useState(false);
  const active = pkg.vtxos.filter((v) => !v.skipped);
  const skipped = pkg.vtxos.filter((v) => v.skipped);
  const graph = pkg.mode === 'graph';

  const exitingValue = active.reduce((s, v) => s + (v.value ?? 0), 0);
  const estimate = useMemo(() => estimateSeconds(pkg, active), [pkg, active]);
  const expired = useMemo(
    () => (pkg.validUntil ? Date.now() / 1000 > pkg.validUntil : false),
    [pkg.validUntil],
  );
  const hasConditionSweep = active.some((v) => v.path?.startsWith('vhtlc'));

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <CardTitle>Exit summary</CardTitle>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-border px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
              {pkg.network}
            </span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide',
                graph ? 'bg-blue-500/15 text-blue-500' : 'bg-primary/15 text-primary',
              )}
            >
              {graph ? 'graph · you fund' : 'funded · keyless'}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
          <Stat
            label="VTXOs exiting"
            value={String(active.length)}
            hint={`${pkg.totals.txCount} transactions`}
          />
          <Stat label="Total value" value={<MoneyDisplay sats={exitingValue} />} />
          <Stat label="You recover" value={<MoneyDisplay sats={pkg.totals.recoveredSats} />} />
          <Stat
            label="Network fees"
            value={<MoneyDisplay sats={pkg.totals.totalFeeSats} />}
            hint={`${pkg.feeRate} sat/vB`}
          />
          <Stat
            label={graph ? 'You send' : 'Funding needed'}
            value={<MoneyDisplay sats={pkg.totals.fundingRequiredSats} />}
            hint={graph ? 'to a throwaway fee address' : 'to the fee wallet'}
          />
          <Stat
            label="Est. time"
            value={formatDuration(estimate)}
            hint={
              <Tooltip content="Approximate: confirmation of each unroll tx (~10-min blocks) plus the longest CSV timelock a VTXO must wait out before its sweep.">
                <span className="inline-flex items-center gap-1 border-b border-dotted border-muted-foreground/50">
                  how? <Info className="h-3 w-3" />
                </span>
              </Tooltip>
            }
          />
        </div>
      </Card>

      {expired && (
        <Warning tone="danger" icon={<Clock className="h-4 w-4" />} title="Validity window passed">
          This package’s <span className="font-mono">validUntil</span> has elapsed. The operator may
          already have swept some branches. Execution will still try — it is harmless — but some
          steps may conflict.
        </Warning>
      )}

      {hasConditionSweep && (
        <Warning tone="warn" icon={<Eye className="h-4 w-4" />} title="Contains condition witnesses">
          A sweep spends a contract path (e.g. a VHTLC preimage). That secret is embedded in the
          pre-signed transaction — treat this package as confidential until every step is broadcast.
        </Warning>
      )}

      <Card>
        <CardTitle>Destination</CardTitle>
        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            Sweep address
            <Tooltip content="Fixed at package creation. The sweep transactions are pre-signed to this address, so it can't be changed here.">
              <Lock className="h-3.5 w-3.5" />
            </Tooltip>
          </span>
          <span className="font-mono text-xs text-foreground" title={pkg.sweepAddress}>
            {truncateHash(pkg.sweepAddress, 12, 10)}
          </span>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <CardTitle>VTXOs being exited</CardTitle>
          <span className="text-xs text-muted-foreground">
            {active.length} · <MoneyDisplay sats={exitingValue} />
          </span>
        </div>
        <div className="mt-4 divide-y divide-border rounded-lg border border-border">
          {active.map((v) => (
            <div key={v.outpoint} className="flex items-center justify-between gap-3 p-3">
              <Tooltip content={`VTXO outpoint (txid:vout): ${v.outpoint}`}>
                <span className="font-mono text-xs text-muted-foreground">
                  {truncateHash(v.outpoint, 10, 8)}
                </span>
              </Tooltip>
              <div className="flex items-center gap-2 text-xs">
                {v.path && (
                  <Tooltip content="The tapscript path this VTXO is spent through onchain.">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                      {pathLabel(v.path)}
                    </span>
                  </Tooltip>
                )}
                {v.delay && (
                  <Tooltip content="The sweep becomes spendable only after this relative timelock elapses from its exit tx confirming.">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                      {delayLabel(v.delay)}
                    </span>
                  </Tooltip>
                )}
                <span className="font-mono text-foreground tabular-nums">
                  <MoneyDisplay sats={v.value ?? 0} />
                </span>
              </div>
            </div>
          ))}
          {skipped.map((v) => (
            <div
              key={v.outpoint}
              className="flex items-center justify-between gap-3 p-3 opacity-60"
            >
              <span className="font-mono text-xs text-muted-foreground" title={v.outpoint}>
                {truncateHash(v.outpoint, 10, 8)}
              </span>
              <span className="text-xs text-destructive/80">skipped · {v.skipped}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex flex-col gap-2">
        <button
          onClick={() => setShowAdvanced((s) => !s)}
          className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showAdvanced && 'rotate-180')} />
          Advanced settings
        </button>
        {showAdvanced && (
          <Card>
            <CardTitle>Esplora endpoint</CardTitle>
            <div className="mt-3 flex flex-col gap-2">
              <input
                value={esplora}
                onChange={(e) => setEsplora(e.target.value)}
                spellCheck={false}
                className="w-full rounded-lg border border-input bg-background p-2.5 font-mono text-xs text-foreground focus:border-ring focus:outline-none"
              />
              <p className="text-[11px] text-muted-foreground">
                Defaults to the SDK endpoint for <span className="font-mono">{pkg.network}</span>.
                Override only if you run your own — must be CORS-permissive and expose{' '}
                <span className="font-mono">/txs/package</span>.
              </p>
            </div>
          </Card>
        )}
      </div>

      <Button
        className="self-end"
        disabled={active.length === 0 || !esplora.trim()}
        onClick={() => onContinue(esplora.trim())}
      >
        {graph ? 'Set up funding' : 'Begin execution'}
        <ArrowRight />
      </Button>
    </div>
  );
}
