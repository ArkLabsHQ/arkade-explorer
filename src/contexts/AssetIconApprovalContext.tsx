import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { AssetIconApprovalManager } from '../lib/assetIconApproval';

interface AssetIconApprovalContextType {
  isApproved: (assetId: string) => boolean;
  isVerified: (assetId: string) => boolean;
  approve: (assetId: string) => void;
  revoke: (assetId: string) => void;
}

const AssetIconApprovalContext = createContext<AssetIconApprovalContextType | undefined>(undefined);

export function AssetIconApprovalProvider({ children }: { children: ReactNode }) {
  const manager = useRef(new AssetIconApprovalManager()).current;
  const [, setRevision] = useState(0);

  const refresh = useCallback(() => setRevision((r) => r + 1), []);

  useEffect(() => {
    const verifiedUrl = import.meta.env.VITE_VERIFIED_ASSETS_URL;
    if (!verifiedUrl) return;

    fetch(verifiedUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data) || !data.every((id) => typeof id === 'string')) {
          throw new Error('Invalid verified assets response');
        }
        manager.setVerifiedAssets(data);
        refresh();
      })
      .catch((err) => console.error('Failed to fetch verified assets:', err));
  }, []);

  const approve = useCallback((assetId: string) => {
    manager.approve(assetId);
    refresh();
  }, []);

  const revoke = useCallback((assetId: string) => {
    manager.revoke(assetId);
    refresh();
  }, []);

  const isApproved = useCallback((assetId: string) => manager.isApproved(assetId), []);
  const isVerified = useCallback((assetId: string) => manager.isVerified(assetId), []);

  return (
    <AssetIconApprovalContext.Provider value={{ isApproved, isVerified, approve, revoke }}>
      {children}
    </AssetIconApprovalContext.Provider>
  );
}

export function useAssetIconApproval() {
  const context = useContext(AssetIconApprovalContext);
  if (!context) {
    throw new Error('useAssetIconApproval must be used within AssetIconApprovalProvider');
  }
  return context;
}
