import { AddressPageClient } from './client';

export const dynamic = 'force-dynamic';

export default async function AddressPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  return <AddressPageClient address={address} />;
}
