import { useState } from 'react';
import { Card } from '../UI/Card';
import { Link } from 'react-router-dom';
import { Copy, Check } from 'lucide-react';
import { copyToClipboard, truncateHash } from '../../lib/utils';
import type { AssetDetails as AssetDetailsType } from '../../lib/api/indexer';

interface AssetDetailsProps {
  assetDetails: AssetDetailsType;
}

function formatSupply(supply: number, decimals: number): string {
  if (decimals === 0) return supply.toLocaleString('en-US');
  const divisor = Math.pow(10, decimals);
  return (supply / divisor).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

export function AssetDetailsCard({ assetDetails }: AssetDetailsProps) {
  const [copiedId, setCopiedId] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const metadata = assetDetails.metadata;
  const name = metadata?.name || truncateHash(assetDetails.assetId, 12, 12);
  const ticker = metadata?.ticker;
  const decimals = metadata?.decimals ?? 0;

  const handleCopyId = () => {
    copyToClipboard(assetDetails.assetId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <Card glowing>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          {metadata?.icon && (
            <img src={metadata.icon} alt="" className="w-10 h-10 rounded-full" />
          )}
          <h1 className="text-2xl font-bold text-arkade-purple uppercase">{name}</h1>
          {ticker && (
            <span className="text-arkade-gray text-lg font-mono uppercase">({ticker})</span>
          )}
        </div>

        {/* Asset ID */}
        <div className="border-b border-arkade-purple pb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-arkade-gray uppercase text-sm font-bold">Asset ID</span>
            <button
              onClick={handleCopyId}
              className="p-1 hover:text-arkade-purple transition-colors flex-shrink-0"
              title="Copy to clipboard"
            >
              {copiedId ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>
          </div>
          <button
            onClick={handleCopyId}
            className="text-arkade-gray font-mono text-xs sm:text-sm hover:text-arkade-purple transition-colors cursor-pointer break-all w-full text-left"
            title="Click to copy"
          >
            {assetDetails.assetId}
          </button>
        </div>

        {/* Ticker */}
        {ticker && (
          <div className="flex items-center justify-between border-b border-arkade-purple pb-2">
            <span className="text-arkade-gray uppercase text-sm font-bold">Ticker</span>
            <span className="text-arkade-gray font-mono">{ticker}</span>
          </div>
        )}

        {/* Decimals */}
        <div className="flex items-center justify-between border-b border-arkade-purple pb-2">
          <span className="text-arkade-gray uppercase text-sm font-bold">Decimals</span>
          <span className="text-arkade-gray font-mono">{decimals}</span>
        </div>

        {/* Total Supply */}
        <div className="flex items-center justify-between border-b border-arkade-purple pb-2">
          <span className="text-arkade-gray uppercase text-sm font-bold">Total Supply</span>
          <span className="text-arkade-gray font-mono">
            {formatSupply(assetDetails.supply, decimals)}
            {ticker && <span className="text-arkade-gray text-xs ml-1">{ticker}</span>}
          </span>
        </div>

        {/* Control Asset */}
        {assetDetails.controlAssetId && (
          <div className="flex items-center justify-between border-b border-arkade-purple pb-2">
            <span className="text-arkade-gray uppercase text-sm font-bold">Control Asset</span>
            <Link
              to={`/asset/${assetDetails.controlAssetId}`}
              className="text-arkade-purple hover:text-arkade-orange font-mono text-sm transition-colors"
            >
              {truncateHash(assetDetails.controlAssetId, 8, 8)}
            </Link>
          </div>
        )}

        {/* Debug: raw metadata */}
        <div className="pt-4 border-t border-arkade-gray/20">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="text-arkade-gray hover:text-arkade-purple text-xs uppercase font-bold transition-colors"
          >
            {showDebug ? '▼ Hide' : '▶ Show'} Raw Metadata
          </button>
          {showDebug && (
            <pre className="mt-2 p-2 bg-arkade-black/50 rounded text-xs overflow-x-auto">
              <code className="text-arkade-gray">
                {JSON.stringify(assetDetails, null, 2)}
              </code>
            </pre>
          )}
        </div>
      </div>
    </Card>
  );
}
