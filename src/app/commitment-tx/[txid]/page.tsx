import { CommitmentTxPageClient } from './client';

export const dynamic = 'force-dynamic';

export default async function CommitmentTxPage({ params }: { params: Promise<{ txid: string }> }) {
  const { txid } = await params;
  return <CommitmentTxPageClient txid={txid} />;
}
