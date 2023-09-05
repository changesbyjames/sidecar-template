import { all, Config, getProject, getStack, interpolate, StackReference, Output, output } from '@pulumi/pulumi';
import { ResourceGroup } from '@pulumi/azure-native/resources';
import { Workspace, getSharedKeysOutput, GetSharedKeysResult } from '@pulumi/azure-native/operationalinsights';
import { ManagedEnvironment } from '@pulumi/azure-native/app';

import setupInsights from './resources/insights';
import { setupB2CApplicationAndUserFlow, setupAPIConnector, setupRedirectURL } from './resources/b2c';
import setupOneDrive, { GraphCreds } from './resources/onedrive';
import setupSidecar from './resources/sidecar';
import setupContainerApp from './resources/container-app';
import setupUI from './resources/ui';
import { StringAsset } from '@pulumi/pulumi/asset';

const project = getProject();
const stack = getStack();
const id = `${project}-${stack}`;

const config = new Config();

export = async () => {
  const creds: GraphCreds = {
    clientId: config.require('client-id'),
    clientSecret: config.require('client-secret'),
    tenantId: config.require('tenant-id'),
    driveId: config.require('drive-id')
  };

  const group = new ResourceGroup(`${id}-group`);
  // Setup Insights
  const { workspace, workspaceSharedKeys, appInsights } = await setupInsights(id, group);

  // Setup OneDrive
  const { customerFolderId, sharedResourceFolderId } = await setupOneDrive(id, creds);
  // Setup sidecar
  const { sidecarFolderId, templateFolder, manifest } = await setupSidecar(id, creds);

  // Setup B2C
  const { uiClientId, apiClientId, uiAppId, apiAppId, scope, userFlowId } = await setupB2CApplicationAndUserFlow(id);
  const openIdConfigurationURL = all([userFlowId]).apply(
    ([userFlowId]) =>
      `${config.require('b2c-tenant-authority')}/${config.require(
        'b2c-tenant-domain-name'
      )}/${userFlowId}/v2.0/.well-known/openid-configuration`
  );

  // Setup API
  const environment = new ManagedEnvironment(`${id}-managed`, {
    resourceGroupName: group.name,
    appLogsConfiguration: {
      destination: 'log-analytics',
      logAnalyticsConfiguration: {
        customerId: workspace.customerId,
        sharedKey: workspaceSharedKeys.apply((r: GetSharedKeysResult) => r.primarySharedKey!)
      }
    }
  });

  const { containerAppURL } = await setupContainerApp(
    id,
    group,
    environment,
    8837,
    {
      name: 'api',
      registry: {
        server: config.require('registry-server'),
        username: config.require('registry-username'),
        password: config.require('registry-password')
      },
      tag: config.require('build-id')
    },
    { maxReplicas: 1, minReplicas: 1, noOfRequestsPerInstance: '100' },
    {
      OPENID_CONFIGURATION_URL: openIdConfigurationURL,
      GRAPH_APP_CLIENT_ID: creds.clientId,
      GRAPH_APP_CLIENT_SECRET: creds.clientSecret,
      GRAPH_APP_TENANT: creds.tenantId,
      APPROVED_DRIVE: creds.driveId,
      SHARED_RESOURCE_FOLDER_ID: sharedResourceFolderId,
      CUSTOMER_FOLDER_ID: customerFolderId
    }
  );

  await setupAPIConnector(
    id,
    userFlowId,
    containerAppURL.apply(url => `${url}/auth`)
  );

  const customConnectionString = appInsights.instrumentationKey.apply(
    key => `InstrumentationKey=${key};IngestionEndpoint=https://insights.si.services/`
  );

  const backstageConfigurationFile = all([
    containerAppURL,
    output(manifest),
    sharedResourceFolderId,
    customConnectionString,
    uiClientId,
    apiClientId,
    userFlowId,
    demosFolderId
  ]).apply(
    ([url, manifest, sharedResourceFolderId, connectionString, uiClientId, apiClientId, userFlowId, demosFolderId]) => {
      return new StringAsset(
        JSON.stringify({
          variables: {
            graphBaseUrl: `${url}/proxy`,
            driveId: creds.driveId,
            sharedResourceFolderId: sharedResourceFolderId,
            sidecarManifest: JSON.stringify(manifest),
            appInsightsConnectionString: connectionString,
            clientId: uiClientId,
            tenant: config.require('b2c-tenant-domain-name'),
            authority: config.require('b2c-tenant-authority'),
            apiClientId: apiClientId,
            apiScope: scope,
            policy: userFlowId,

            supportEmail: 'james-williams@softwareimaging.com'
          },
          flags: {}
        })
      );
    }
  );
  // Setup UI
  const { accountName, containerName, endpoint, endpointName, profileName, resourceGroupName } = await setupUI(
    id,
    group,
    backstageConfigurationFile
  );
  await setupRedirectURL(
    id,
    uiAppId,
    endpoint.apply(endpoint => `${endpoint}/auth/redirect`)
  );

  return {
    manifest: output(manifest).apply(JSON.stringify),
    customerFolderId,
    sharedResourceFolderId,
    sidecarFolderId,
    demosFolderId,
    uiClientId,
    apiClientId,
    uiAppId,
    apiAppId,
    scope,
    openIdConfigurationURL,
    userFlowId,
    accountName,
    containerName,
    endpoint,
    endpointName,
    profileName,
    resourceGroupName,
    containerAppURL
  };
};
