/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client, CoreKey, MiddlewareOptions, Result, TypedGraphRequest } from '@microsoft/microsoft-graph-client';
import { FC, PropsWithChildren, useMemo } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useQuery as useOriginalQuery,
  useMutation as useOriginalMutation,
  UseQueryOptions,
  useQueryClient,
  MutationFunction
} from '@tanstack/react-query';
import { GraphResponse, useGraph } from './GraphProvider';
import { persistQueryClient } from '@tanstack/react-query-persist-client';

import { GraphRequest, GraphRequestCallback, ResponseType } from '@microsoft/microsoft-graph-client';
import { Batcher } from './utils/batch';
import { createIDBPersister } from './utils/persist';
declare module '@microsoft/microsoft-graph-client' {
  interface KeyValuePairObjectStringNumber {
    [key: string]: string | number;
  }

  interface Client {
    api<T extends Result>(path: string): TypedGraphRequest<T>;
  }

  type Result = Record<string, any> | Array<Record<string, any>>;
  type CoreType<T extends Result> = T extends Array<infer U> ? U : T;
  type CoreKey<T extends Result> = keyof CoreType<T>;
  type Response<T extends Result, S extends CoreKey<T> = CoreKey<T>> = T extends Array<any>
    ? GraphResponse<Pick<CoreType<T>, S>[]>
    : Pick<CoreType<T>, S>;

  interface TypedGraphRequest<T extends Result = Result, S extends CoreKey<T> = CoreKey<T>> extends GraphRequest {
    get(callback?: GraphRequestCallback): Promise<Response<T, S>>;
    post(content: any, callback?: GraphRequestCallback): Promise<Response<T, S>>;
    create(content: any, callback?: GraphRequestCallback): Promise<Response<T, S>>;
    put(content: any, callback?: GraphRequestCallback): Promise<Response<T, S>>;
    patch(content: any, callback?: GraphRequestCallback): Promise<Response<T, S>>;
    update(content: any, callback?: GraphRequestCallback): Promise<Response<T, S>>;
    delete(callback?: GraphRequestCallback): Promise<Response<T, S>>;
    del(callback?: GraphRequestCallback): Promise<void>;
    select<E extends CoreKey<T>>(select: E[]): TypedGraphRequest<T, E>;

    header(headerKey: string, headerValue: string): TypedGraphRequest<T, S>;
    headers(headers: KeyValuePairObjectStringNumber | HeadersInit): TypedGraphRequest<T, S>;
    option(key: string, value: any): TypedGraphRequest<T, S>;
    options(options: { [key: string]: any }): TypedGraphRequest<T, S>;
    middlewareOptions(options: MiddlewareOptions[]): TypedGraphRequest<T, S>;
    version(version: string): TypedGraphRequest<T, S>;
    responseType(responseType: ResponseType): TypedGraphRequest<T, S>;
    expand(properties: string | string[]): TypedGraphRequest<T, S>;
    orderby(properties: string | string[]): TypedGraphRequest<T, S>;
    filter(filterStr: string): TypedGraphRequest<T, S>;
    search(searchStr: string): TypedGraphRequest<T, S>;
    top(n: number): TypedGraphRequest<T, S>;
    skip(n: number): TypedGraphRequest<T, S>;
    skipToken(token: string): TypedGraphRequest<T, S>;
    count(isCount?: boolean): TypedGraphRequest<T, S>;
    query(queryDictionaryOrString: string | KeyValuePairObjectStringNumber): TypedGraphRequest<T, S>;
  }
}

export const QueryProvider: FC<PropsWithChildren> = ({ children }) => {
  const client = useMemo(() => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          suspense: true,
          staleTime: 15,
          cacheTime: 24 * 60 * 60 * 1000,
          refetchOnWindowFocus: false
        }
      }
    });
    const persister = createIDBPersister();

    persistQueryClient({ queryClient, persister });
    return queryClient;
  }, []);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

/*
  This is a wrapper around the react-query useQuery hook that enables two things:
  1. It lets us use graph resources as keys
  2. It lets us default to suspense mode
*/
export function useQuery<T>(
  key: (string | TypedGraphRequest)[],
  queryFn: () => Promise<T>,
  options?: Omit<UseQueryOptions<T, unknown, unknown, string[]>, 'queryKey' | 'queryFn'>
) {
  const result = useOriginalQuery(
    key.map(k => {
      if (typeof k === 'string') return k;
      return getUniqueIdentifier(k);
    }),
    async () => await queryFn(),
    options
  );
  return [result.data as T, result] as const;
}

interface MutationOptions {
  invalidate?: {
    resource?: TypedGraphRequest | TypedGraphRequest[];
    key?: string[];
  };
}

export function useGraphMutation<T, V = unknown>(func: MutationFunction<T, V>, options?: MutationOptions) {
  const client = useQueryClient();
  return useOriginalMutation<T, unknown, V>({
    mutationFn: func,
    onSuccess: () => {
      if (!options) return;
      if (options?.invalidate) {
        const { resource, key = [] } = options.invalidate;
        if (resource) {
          const resourceIdentifiers = Array.isArray(resource)
            ? resource.map(getUniqueIdentifier)
            : [getUniqueIdentifier(resource)];
          client.invalidateQueries([...resourceIdentifiers, ...key]);
          return;
        }

        client.invalidateQueries(key);
      }
    }
  });
}

export const getUniqueIdentifier = (resource: TypedGraphRequest) => {
  // There is a private function that does this, but it's not exported
  // so we need to punch a hole in the type system to get it.

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wildWest = resource as any;
  if (!wildWest.buildFullUrl) throw new Error('buildFullUrl is not defined');
  const url = wildWest.buildFullUrl();
  return url as string;
};

export const getPath = (resource: TypedGraphRequest) => {
  const wildWest = resource as any;
  if (!wildWest.urlComponents.path) throw new Error('urlComponents is not defined');
  return wildWest.urlComponents.path + wildWest.createQueryString();
};

export const getHeaders = (resource: TypedGraphRequest) => {
  const wildWest = resource as any;
  if (!wildWest._headers) throw new Error('_headers is not defined');
  return wildWest._headers;
};

export async function batch<T extends Result, S extends CoreKey<T> = CoreKey<T>>(
  resource: TypedGraphRequest<T, S>,
  batcher: Batcher<{ id: string; body: Result }, TypedGraphRequest, Result>
) {
  const response = await batcher.fetch(resource);
  return response as ReturnType<typeof resource.get>;
}

/*
  This is a wrapper around the our useQuery hook that enables three more things:
  1. It looks for an Etag from the previous request and sends it as a header
  2. If the request returns a 304, it returns the cached value
  3. It uses the batcher to batch requests
*/

export function useResource<T extends Result, S extends CoreKey<T> = CoreKey<T>>(
  fn: (client: Client) => TypedGraphRequest<T, S>
) {
  const { client, batcher } = useGraph();
  const queryClient = useQueryClient();
  const resource = fn(client);

  return useQuery([resource], async () => {
    const cached = queryClient.getQueryData([getUniqueIdentifier(resource)]);
    const eTag = attemptToDetermineETag(cached);
    if (eTag) resource.header('If-None-Match', eTag);
    const response = await batch(resource, batcher);
    if (!response) {
      // If there is no response but it also hasn't errored, then we can assume
      // that the cached value is still valid.
      return cached as ReturnType<typeof resource.get>;
    }
    // If there is a response, then we can assume that the cached value is stale
    return response;
  });
}

export const attemptToDetermineETag = (data: any) => {
  if (!data) return undefined;
  if (typeof data !== 'object') return undefined;
  if (data['eTag']) return data['eTag'];
};
