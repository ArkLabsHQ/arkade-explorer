import { useState } from 'react';
import { Card } from '../UI/Card';
import { Eye, EyeOff } from 'lucide-react';
import { CopyButton } from '../UI/CopyButton';

interface TransactionHexProps {
  txHex?: string;
  label?: string;
}

export function TransactionHex({ txHex, label = 'Raw Transaction' }: TransactionHexProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!txHex) return null;

  return (
    <Card>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-arkade-purple uppercase">{label}</h3>
          <div className="flex items-center space-x-2">
            <CopyButton text={txHex} />
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:text-arkade-purple transition-colors"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        
        {isExpanded && (
          <div className="bg-arkade-black border border-arkade-purple p-3 overflow-x-auto">
            <code className="text-arkade-gray font-mono text-xs break-all">
              {txHex}
            </code>
          </div>
        )}
      </div>
    </Card>
  );
}
