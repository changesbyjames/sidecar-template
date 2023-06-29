import { Client, ClientOptions, Result, TypedGraphRequest } from '@microsoft/microsoft-graph-client';
import { useVariable } from '@softwareimaging/backstage';
import { createContext, FC, PropsWithChildren, useContext, useMemo } from 'react';
import { Variables } from '../backstage/config';
import { useRequestToken } from '../authentication/hooks/auth';
import { Batcher, create, windowScheduler } from './utils/batch';
import { getHeaders, getPath, getUniqueIdentifier } from './QueryProvider';

interface BatchInfo {
  id: string;
  body: Result;
  status: number;
  headers: Record<string, string>;
}

interface BatchStep {
  id: string;
  url: string;
  method: 'GET';
  headers: Record<string, string>;
}

interface GraphInformation {
  client: Client;
  batcher: Batcher<BatchInfo, TypedGraphRequest, Result>;
}
const GraphContext = createContext<GraphInformation | null>(null);

export const GraphProvider: FC<PropsWithChildren> = ({ children }) => {
  // If we're using the proxy, we need to set the base URL and custom hosts
  const proxy = useVariable<Variables>('graphBaseUrl');
  // This can be any access token:
  // - B2C if you're using the proxy
  // - AD if you're not
  // It should be automatically picked up by the auth provider
  const getAccessToken = useRequestToken();

  const client = useMemo(() => {
    const options: ClientOptions = {
      authProvider: {
        getAccessToken
      },
      defaultVersion: 'v1.0'
    };

    // If we're using the proxy, we need to set the base URL and custom hosts
    if (proxy) {
      const url = new URL(proxy);
      options.baseUrl = url.toString();
      options.customHosts = new Set([url.hostname]);
    }

    // If we're not using the proxy, the URL is already set to the default
    const client = Client.initWithMiddleware(options);
    return client;
  }, [getAccessToken, proxy]);

  // To improve performance on page loads we can batch requests
  const batcher = useMemo(() => {
    return create<BatchInfo, TypedGraphRequest, Result>({
      // Graph has a limit of 20 requests per batch
      limit: 20,
      // The ensures that all requests made within a 20ms window are batched together
      scheduler: windowScheduler(20),
      // This is the actual fetcher that will be used to make the requests
      fetcher: async resources => {
        // We need to remove duplicates because graph doesn't like them
        const unique = resources.reduce((acc, resource) => {
          const id = getUniqueIdentifier(resource);
          if (acc[id]) return acc;
          acc[id] = resource;
          return acc;
        }, {} as Record<string, TypedGraphRequest>);

        // We need to convert the resources into batch steps
        const steps: BatchStep[] = Object.entries(unique).map(([id, resource]) => {
          return {
            id,
            url: `/${getPath(resource)}`,
            method: 'GET',
            headers: getHeaders(resource)
          };
        });
        // We need to make the batch request
        const response = await client.api<{ responses: BatchInfo[] }>('$batch').post({ requests: steps });
        return response.responses;
      },
      resolver: (responses, resource) => {
        // The resolver is used to match the original request to one of the responses in the batch
        const res = responses.find(r => r.id === getUniqueIdentifier(resource));
        if (!res) {
          console.log(resource, responses);
          throw new Error('Response not found');
        }

        // If the response is an error, we need to throw it
        if (res.status >= 400) {
          // TODO: We should probably do something better here
          throw res.body;
        }
        return res.body;
      }
    });
  }, [client]);

  return <GraphContext.Provider value={{ client, batcher }}>{children}</GraphContext.Provider>;
};

export const useGraph = () => {
  const graphInformation = useContext(GraphContext);
  if (!graphInformation) {
    throw new Error('useGraph must be used within a GraphProvider');
  }
  return graphInformation;
};

export interface GraphResponse<T> {
  '@odata.context': string;
  value: T;
}
