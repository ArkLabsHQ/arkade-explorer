import { CommitmentTxPageClient } from './client';

export const dynamic = 'force-dynamic';

export function generateMetadata() {
  return { title: 'Commitment transaction | Arkade Explorer' };
}

export default async function CommitmentTxPage({ params }: { params: Promise<{ txid: string }> }) {
  const { txid } = await params;
  return <CommitmentTxPageClient txid={txid} />;
}
