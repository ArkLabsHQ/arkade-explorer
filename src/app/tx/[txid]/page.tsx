import { TransactionPageClient } from './client';

export const dynamic = 'force-dynamic';

export default async function TransactionPage({ params }: { params: Promise<{ txid: string }> }) {
  const { txid } = await params;
  return <TransactionPageClient txid={txid} />;
}
