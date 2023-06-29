import { BackstageConfig } from '@softwareimaging/backstage';

export interface Config extends BackstageConfig {
  variables: {
    // Graph
    graphBaseUrl: string;
    driveId: string;
    sidecarManifest: string;

    // Support
    supportEmail: string;

    // App Insights
    appInsightsConnectionString?: string;
    
    // B2C
    clientId: string;
    policy: string;
    apiClientId: string;
    authority: string;
    apiScope: string;
    tenant: string;
  };
  flags: {};
}

export type Variables = keyof Config['variables'];
export type Flags = keyof Config['flags'];
