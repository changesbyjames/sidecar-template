import { FC, PropsWithChildren, useMemo } from 'react';
import { Backstage } from '@softwareimaging/backstage';
import LocalProvider from '@softwareimaging/backstage-local';
import HTTPProvider from '@softwareimaging/backstage-http';
import { config } from './local';

interface BackstageProviderProps {}

export const BackstageProvider: FC<PropsWithChildren<BackstageProviderProps>> = ({ children }) => {
  const providers = useMemo(() => {
    const providers = [];
    if (import.meta.env.DEV) {
      providers.push(LocalProvider(1, { config }));
    }

    if (import.meta.env.PROD) {
      providers.push(HTTPProvider(0, { url: '/backstage.json' }));
    }
    return providers;
  }, [config]);

  return <Backstage providers={providers}>{children}</Backstage>;
};
