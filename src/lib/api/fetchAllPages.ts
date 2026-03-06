import type { PaginationOptions, PageResponse } from '@arkade-os/sdk';
import { PAGINATION } from '../constants';

/**
 * Generic helper that fetches all pages from a paginated SDK call
 * and merges the array results under `mergeKey`.
 */
export async function fetchAllPages<T extends Record<string, unknown>>(
  fn: (opts: PaginationOptions) => Promise<T & { page?: PageResponse }>,
  mergeKey: keyof T & string,
  pageSize: number = PAGINATION.DEFAULT_PAGE_SIZE,
): Promise<T> {
  let pageIndex = 0;
  let result: T | undefined;
  const fetched = new Set<number>();

  while (true) {
    const response = await fn({ pageIndex, pageSize });
    fetched.add(pageIndex);

    if (!result) {
      result = response;
    } else {
      const existing = result[mergeKey];
      const incoming = response[mergeKey];
      if (Array.isArray(existing) && Array.isArray(incoming)) {
        (result as Record<string, unknown>)[mergeKey] = [...existing, ...incoming];
      }
    }

    // Stop when there are no more pages
    if (!response.page) break;
    const items = response[mergeKey];
    if (Array.isArray(items) && items.length < pageSize) break;
    const { next, current, total } = response.page;
    if (next <= current) break;
    if (total > 0 && current >= total - 1) break;
    if (fetched.has(next)) break;

    pageIndex = next;
  }

  return result!;
}
