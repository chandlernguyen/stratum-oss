import type { QueryClient } from '@tanstack/react-query';

type QueryKeyInput = ReadonlyArray<unknown>;

export function invalidateQueryKeys(queryClient: QueryClient, keys: QueryKeyInput[]) {
  keys.forEach((key) => {
    if (!key.length) {
      return;
    }

    const sanitizedKey = key.filter((segment) => segment !== undefined && segment !== null) as QueryKeyInput;
    if (!sanitizedKey.length) {
      return;
    }

    queryClient.invalidateQueries({ queryKey: sanitizedKey });
  });
}

interface HandleResourceNotFoundOptions<T> {
  queryClient: QueryClient;
  queryKeys: QueryKeyInput[];
  logMessage: string;
  payload: T;
}

export function handleResourceNotFound<T>({
  queryClient,
  queryKeys,
  logMessage,
  payload,
}: HandleResourceNotFoundOptions<T>): T {
  invalidateQueryKeys(queryClient, queryKeys);
  console.log(logMessage);
  return payload;
}
