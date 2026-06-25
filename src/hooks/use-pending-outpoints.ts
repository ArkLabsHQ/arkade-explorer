import { useQuery } from '@tanstack/react-query';
import { indexerClient } from '@/lib/api/indexer';
import { fetchAllPages } from '@/lib/api/fetchAllPages';

const EMPTY_SET: ReadonlySet<string> = new Set<string>();

interface UsePendingOutpointsArgs {
  scripts?: string[];
  enabled: boolean;
}

/**
 * Returns the set of "txid:vout" outpoints the indexer reports as pending (an offchain
 * tx submitted but not finalized) for the given VTXO scripts.
 *
 * IMPORTANT: the indexer only honors the `pendingOnly` (and other status) filters for
 * `scripts` queries. An `outpoints` query ignores the filter and echoes back every
 * requested outpoint, which would mislabel finalized spends — so detection must always
 * go through scripts. Callers collect the scripts of the VTXOs they display and gate
 * `enabled` on the presence of a spent VTXO so nothing-spent views pay no extra request.
 */
export function usePendingOutpoints(args: UsePendingOutpointsArgs): ReadonlySet<string> {
  const { scripts, enabled } = args;
  const hasInput = !!scripts?.length;
  const key = scripts?.length ? scripts.join(',') : '';

  const { data } = useQuery({
    queryKey: ['pending-outpoints', key],
    queryFn: async () => {
      const result = await fetchAllPages(
        (opts) => indexerClient.getVtxos({ scripts: scripts!, pendingOnly: true, ...opts }),
        'vtxos',
      );
      return new Set(result.vtxos.map((v) => `${v.txid}:${v.vout}`));
    },
    enabled: enabled && hasInput,
    staleTime: 30_000,
  });

  return data ?? EMPTY_SET;
}
