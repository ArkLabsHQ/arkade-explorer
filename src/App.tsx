import { Routes, Route } from 'react-router-dom';
import { AppProviders } from '@/providers/app-providers';
import { DynamicLayout } from '@/components/dynamic-layout';
import { HomePage } from '@/pages/home';
import { TransactionPage } from '@/pages/tx';
import { CommitmentTxPage } from '@/pages/commitment-tx';
import { AddressPage } from '@/pages/address';
import { AssetPage } from '@/pages/asset';
import { NotFoundPage } from '@/pages/not-found';

export function App() {
  return (
    <AppProviders>
      <DynamicLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tx/:txid" element={<TransactionPage />} />
          <Route path="/commitment-tx/:txid" element={<CommitmentTxPage />} />
          <Route path="/address/:address" element={<AddressPage />} />
          <Route path="/asset/:assetId" element={<AssetPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </DynamicLayout>
    </AppProviders>
  );
}
