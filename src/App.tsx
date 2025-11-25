import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout/Layout';
import { HomePage } from './pages/HomePage';
import { TransactionPage } from './pages/TransactionPage';
import { AddressPage } from './pages/AddressPage';
import { CommitmentTxPage } from './pages/CommitmentTxPage';
import { ServerInfoProvider } from './contexts/ServerInfoContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotFoundPage } from './components/NotFound/NotFoundPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ServerInfoProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path="tx/:txid" element={<TransactionPage />} />
                <Route path="address/:address" element={<AddressPage />} />
                <Route path="commitment-tx/:txid" element={<CommitmentTxPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ServerInfoProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
