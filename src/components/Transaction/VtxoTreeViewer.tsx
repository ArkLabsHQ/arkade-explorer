import { useState } from 'react';
import { Card } from '../UI/Card';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { truncateHash } from '../../lib/utils';

interface TreeNode {
  txid: string;
  children: Record<number, string>;
}

interface VtxoTreeViewerProps {
  tree: TreeNode[];
}

function TreeNodeComponent({ node, allNodes }: { node: TreeNode; allNodes: Map<string, TreeNode> }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = Object.keys(node.children).length > 0;

  return (
    <div className="ml-4 border-l-2 border-arkade-purple pl-4 py-1">
      <div className="flex items-center space-x-2">
        {hasChildren && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-arkade-purple hover:text-arkade-orange transition-colors"
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        )}
        <span className="text-arkade-gray font-mono text-sm">
          {truncateHash(node.txid, 8, 8)}
        </span>
      </div>
      
      {isExpanded && hasChildren && (
        <div className="mt-1">
          {Object.entries(node.children).map(([vout, childTxid]) => {
            const childNode = allNodes.get(childTxid);
            return childNode ? (
              <div key={`${node.txid}-${vout}`}>
                <div className="text-arkade-gray text-xs ml-4">vout: {vout}</div>
                <TreeNodeComponent node={childNode} allNodes={allNodes} />
              </div>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

export function VtxoTreeViewer({ tree }: VtxoTreeViewerProps) {
  if (!tree || tree.length === 0) return null;

  const nodesMap = new Map(tree.map(node => [node.txid, node]));
  const rootNodes = tree.filter(node => {
    return !tree.some(n => Object.values(n.children).includes(node.txid));
  });

  return (
    <Card>
      <h2 className="text-xl font-bold text-arkade-purple uppercase mb-4">VTXO Tree</h2>
      <div className="space-y-2">
        {rootNodes.map(root => (
          <TreeNodeComponent key={root.txid} node={root} allNodes={nodesMap} />
        ))}
      </div>
    </Card>
  );
}
