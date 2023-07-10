/**
 * A differed value that can be resolved at a later time outside of its closure.
 * @generic T - value of the differed
 */
export type Differed<T> = {
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: string) => void;
  value: Promise<T>;
};

/**
 * Create a new Differed
 *
 * @generic T - value of the differed
 * @returns Deferred<T>
 */
export const deferred = <T>(): Differed<T> => {
  let resolve!: Differed<T>['resolve'];
  let reject!: Differed<T>['reject'];

  const value = new Promise<T>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });

  return {
    resolve,
    reject,
    value
  };
};

/**
 * Type guard for Differed values.
 *
 * @generic T - value of the differed
 * @param value any
 * @returns value is Deferred<T>
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isDeferred = <T>(value: any): value is Differed<T> =>
  typeof value === 'object' &&
  value !== null &&
  'resolve' in value &&
  'reject' in value &&
  'value' in value &&
  'then' in value.value;
