import { ReactPlugin } from '@microsoft/applicationinsights-react-js';
import { ApplicationInsights, DistributedTracingModes } from '@microsoft/applicationinsights-web';
import { useVariable } from '@softwareimaging/backstage';
import { FC, PropsWithChildren, useEffect, useMemo, createContext, useContext, useState } from 'react';
import { createStore, StoreApi, useStore } from 'zustand';
import { Variables } from '../backstage/config';

import { build } from '~build/meta';
import now from '~build/time';

interface NetworkInformation {
  readonly effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
}

declare global {
  interface Navigator {
    readonly connection?: NetworkInformation;
  }
}

interface AppInsightsStore {
  getSessionId: () => string | undefined;
  trackException: (exception: Error) => void;
  addAuthenticatedUserContext: (userId: string) => void;
  trackEvent: (name: string, properties?: { [key: string]: string }) => void;
}
const AppInsightsContext = createContext<StoreApi<AppInsightsStore> | null>(null);

export const AppInsightsProvider: FC<PropsWithChildren> = ({ children }) => {
  const connectionString = useVariable<Variables>('appInsightsConnectionString');

  const [appInsights] = useState<ApplicationInsights>(() => {
    const reactPlugin = new ReactPlugin();
    const insights = new ApplicationInsights({
      config: {
        connectionString,
        enableAutoRouteTracking: true,
        extensions: [reactPlugin],
        // Without GDPR consent, we can't store any data related to analytics
        isStorageUseDisabled: true,

        // We can able end-to-end correlation with the backend with the following settings
        enableCorsCorrelation: true,
        distributedTracingMode: DistributedTracingModes.W3C,

        // We can add additional context to the request
        addRequestContext: () => ({
          // In chrome & edge, the network information API is available
          // This gives an approximate indication of the network quality
          networkQuality: window?.navigator.connection?.effectiveType ?? 'Unknown',

          // We can also add the build information to the request
          buildId: build ?? 'Unknown',
          builtAt: now?.toISOString()
        })
      }
    });
    return insights;
  });

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.warn('AppInsights is not enabled in development');
      return;
    }

    if (appInsights.appInsights.isInitialized()) {
      return;
    }

    appInsights.loadAppInsights();
  }, [appInsights]);

  const store = useMemo(
    () =>
      createStore<AppInsightsStore>((set, get) => ({
        getSessionId: () => {
          if (!appInsights) {
            return 'No session in development';
          }
          return appInsights?.context?.getSessionId();
        },
        trackException: (exception: Error) => {
          if (!appInsights) {
            console.error(exception);
            return;
          }
          appInsights.trackException({ exception });
        },
        addAuthenticatedUserContext: (userId: string, partnerId?: string) => {
          if (!appInsights) {
            console.warn(`AppInsights is not enabled in development: $%{userId}%`);
            return;
          }
          appInsights.setAuthenticatedUserContext(userId, partnerId, true);
        },
        trackEvent: (name: string, properties?: { [key: string]: string }) => {
          if (!appInsights) {
            console.warn(`AppInsights is not enabled in development: $%{name}%`);
            return;
          }
          appInsights.trackEvent({ name }, properties);
        }
      })),
    [appInsights]
  );

  return <AppInsightsContext.Provider value={store}>{children}</AppInsightsContext.Provider>;
};

type SelectorReturn<S extends (s: AppInsightsStore) => any> = ReturnType<S>;

export function useAppInsights<S extends (s: AppInsightsStore) => any>(selector: S): SelectorReturn<S> {
  const context = useContext(AppInsightsContext);
  if (!context) {
    throw new Error('useAppInsights must be used within a AppInsightsProvider');
  }
  return useStore(context, selector);
}
