import { Config } from './config';

export const config: Config = {
  variables: {
    graphBaseUrl: 'http://localhost:6100/proxy',
    driveId: '<%= driveId %>',
    sidecarManifest: `{}`,
    
    clientId: '957960a2-a907-42bb-9a7c-d936e5b24a48',
    tenant: 'softwareimagingpartners.onmicrosoft.com',
    authority: 'https://softwareimagingpartners.b2clogin.com',
    apiClientId: '4ca3f22b-3fa5-479b-aa84-b452cc60e8a8',
    apiScope: 'API.Access',
    policy: 'B2C_1_SIGN_UP_SIGN_IN',

    supportEmail: 'james-williams@softwareimaging.com'
  },
  flags: {}
};
