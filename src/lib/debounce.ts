/** Trailing-edge debounce: invokes `fn` once, `ms` after the last call. */
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  ms: number,
): ((...args: A) => void) & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const debounced = (...args: A) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      fn(...args);
    }, ms);
  };

  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
  };

  return debounced;
}
