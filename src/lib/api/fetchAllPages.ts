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

  while (true) {
    const response = await fn({ pageIndex, pageSize });

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
    if (response.page.next <= response.page.current) break;
    if (response.page.total > 0 && response.page.next >= response.page.total) break;

    pageIndex = response.page.next;
  }

  return result!;
}
