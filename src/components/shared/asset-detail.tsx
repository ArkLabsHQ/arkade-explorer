'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { Copy, Check, Shield, Image as ImageIcon, ChevronDown, ChevronRight } from 'lucide-react';
import type { AssetDetails } from '@/lib/api/indexer';
import { isSafeImageUrl, formatAssetAmount } from '@/lib/api/indexer';
import { useAssetIconApproval } from '@/providers/asset-icon-approval-provider';
import { truncateHash, copyToClipboard } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ImageLightbox } from '@/components/shared/image-lightbox';

interface AssetDetailProps {
  assetDetails: AssetDetails;
  className?: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="text-muted-foreground hover:text-foreground transition-colors duration-150 shrink-0"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-primary" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

export function AssetDetail({ assetDetails, className }: AssetDetailProps) {
  const [showDebug, setShowDebug] = useState(false);
  const { isApproved, isVerified, approve, revoke } = useAssetIconApproval();
  const metadata = assetDetails.metadata;
  const decimals = metadata?.decimals ?? 0;
  const iconUrl = metadata?.icon;
  const hasIcon = !!iconUrl && isSafeImageUrl(iconUrl);
  const iconApproved = isApproved(assetDetails.assetId);
  const iconVerified = isVerified(assetDetails.assetId);
  const showIcon = hasIcon;

  // AssetId format: 64 hex chars (txid) + remaining chars (group index)
  const genesisTxid =
    assetDetails.assetId.length >= 64
      ? assetDetails.assetId.substring(0, 64)
      : null;

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-6 shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_hsl(var(--border)/0.2)]',
        className,
      )}
    >
      {/* Header with icon */}
      <div className="flex items-start gap-4 mb-6">
        {showIcon ? (
          <div className="w-12 h-12 rounded-lg border border-border bg-secondary/30 overflow-hidden shrink-0">
            <ImageLightbox
              src={iconUrl!}
              alt={metadata?.name ?? 'Asset icon'}
              className="w-full h-full object-cover"
            />
          </div>
        ) : hasIcon && !iconApproved ? (
          <button
            onClick={() => approve(assetDetails.assetId)}
            className="w-12 h-12 rounded-lg border border-border bg-secondary/30 flex items-center justify-center shrink-0 hover:bg-secondary/50 transition-colors duration-150"
            title="Click to approve loading this asset icon"
          >
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          </button>
        ) : (
          <div className="w-12 h-12 rounded-lg border border-border bg-secondary/30 flex items-center justify-center shrink-0">
            <span className="text-lg font-heading font-bold text-muted-foreground">
              {metadata?.ticker?.charAt(0) ?? '?'}
            </span>
          </div>
        )}

        <div className="min-w-0">
          <h2 className="font-heading text-xl font-bold text-foreground">
            {metadata?.name ?? 'Unknown asset'}
          </h2>
          {metadata?.ticker && (
            <span className="text-sm text-muted-foreground">{metadata.ticker}</span>
          )}
          {iconVerified && (
            <div className="flex items-center gap-1 mt-1">
              <Shield className="h-3 w-3 text-primary" />
              <span className="text-xs text-primary">Verified</span>
            </div>
          )}
        </div>
      </div>

      {/* Detail rows */}
      <div className="space-y-4">
        {/* Asset ID */}
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1 block">
            Asset ID
          </label>
          <div className="flex items-center gap-2">
            <span className="text-foreground font-mono text-xs break-all">
              {assetDetails.assetId}
            </span>
            <CopyButton text={assetDetails.assetId} />
          </div>
        </div>

        {/* Genesis transaction */}
        {genesisTxid && (
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1 block">
              Genesis TX
            </label>
            <Link
              href={`/tx/${genesisTxid}`}
              className="text-primary hover:text-primary/80 font-mono text-sm transition-colors duration-150"
            >
              {truncateHash(genesisTxid, 8, 8)}
            </Link>
          </div>
        )}

        {/* Supply */}
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1 block">
            Supply
          </label>
          <span className="text-foreground font-mono text-sm">
            {formatAssetAmount(assetDetails.supply, decimals)}
            {metadata?.ticker ? ` ${metadata.ticker}` : ''}
          </span>
        </div>

        {/* Decimals */}
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1 block">
            Decimals
          </label>
          <span className="text-foreground font-mono text-sm">{decimals}</span>
        </div>

        {/* Control asset ID */}
        {assetDetails.controlAssetId && (
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1 block">
              Control asset
            </label>
            <div className="flex items-center gap-2">
              <Link
                href={`/asset/${assetDetails.controlAssetId}`}
                className="text-primary hover:text-primary/80 font-mono text-xs break-all transition-colors duration-150"
              >
                {truncateHash(assetDetails.controlAssetId, 8, 8)}
              </Link>
              <CopyButton text={assetDetails.controlAssetId} />
            </div>
          </div>
        )}

        {/* Icon approval toggle (non-verified assets only) */}
        {hasIcon && !iconVerified && (
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Asset icon
            </label>
            <button
              onClick={() => {
                if (iconApproved) {
                  revoke(assetDetails.assetId);
                } else {
                  approve(assetDetails.assetId);
                }
              }}
              className="px-3 py-1 text-xs font-medium rounded-md border border-border bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors duration-150"
            >
              {iconApproved ? 'Hide icon' : 'Show icon'}
            </button>
          </div>
        )}
      </div>

      {/* Raw metadata debug toggle */}
      <div className="mt-6 pt-4 border-t border-border">
        <button
          onClick={() => setShowDebug((prev) => !prev)}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors duration-150"
        >
          {showDebug ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
          <span className="uppercase tracking-wide">Raw metadata</span>
        </button>
        {showDebug && (
          <pre className="mt-3 p-3 rounded-lg bg-secondary/50 border border-border text-xs overflow-x-auto">
            <code className="text-muted-foreground">
              {JSON.stringify(assetDetails, null, 2)}
            </code>
          </pre>
        )}
      </div>
    </div>
  );
}
