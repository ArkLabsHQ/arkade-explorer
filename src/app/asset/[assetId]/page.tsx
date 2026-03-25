import { AssetPageClient } from './client';

export const dynamic = 'force-dynamic';

export default async function AssetPage({ params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  return <AssetPageClient assetId={assetId} />;
}
