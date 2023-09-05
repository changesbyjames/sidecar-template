import { Config, getStack, getProject, Input, all, output } from '@pulumi/pulumi';
import { RandomString, RandomPassword } from '@pulumi/random';

import {
  B2CApplication,
  B2CUserFlow,
  B2CUserFlowType,
  B2CAPIConnector,
  B2CAPIConnectorConfiguration,
  APIConnectorEvents,
  ApplicationType,
  B2CUserFlowAttribute,
  B2CApplicationRedirectConfiguration,
  B2CApplicationSecret,
  B2CApplicationAPIPermission,
  PermissionAccess
} from '@kitcar/pulumi';
const config = new Config();
const project = getProject();
const stack = getStack();

export const setupB2CApplicationAndUserFlow = async (id: string) => {
  const environment = {
    clientId: config.require('b2c-client-id'),
    clientSecret: config.require('b2c-client-secret'),
    tenantId: config.require('b2c-tenant-id'),
    tenantDomainName: config.require('b2c-tenant-domain-name')
  };

  const apiB2CApplication = new B2CApplication(`${id}-b2c-app-api`, {
    ...environment,
    displayName: `${project} ${stack} API`,
    publishedScopes: ['API.Access']
  });

  const apiB2CApplicationSecret = new B2CApplicationSecret(`${id}-b2c-app-api-secret`, {
    ...environment,
    applicationId: apiB2CApplication.id
  });

  new B2CApplicationAPIPermission(`${id}-b2c-app-api-permission`, {
    ...environment,
    applicationId: apiB2CApplication.id,
    permission: {
      resourceAppId: '00000003-0000-0000-c000-000000000000',
      resourceAccess: [
        {
          id: 'df021288-bdef-4463-88db-98f22de89214',
          type: 'Role'
        }
      ]
    }
  });

  const uiB2CApplication = new B2CApplication(`${id}-b2c-app-ui`, {
    ...environment,
    displayName: `${project} ${stack} UI`
  });

  const resourceAccess = output(apiB2CApplication.oauth2PermissionScopes).apply(
    scopes => scopes.map(scope => scope.id && { id: scope.id, type: 'Scope' }).filter(Boolean) as PermissionAccess[]
  );
  new B2CApplicationAPIPermission(`${id}-b2c-app-api-permission`, {
    ...environment,
    applicationId: apiB2CApplication.id,
    permission: {
      resourceAppId: apiB2CApplication.applicationClientId,
      resourceAccess
    }
  });

  const userFlowName = stack === 'prod' ? 'PROD_SIGN_UP_SIGN_IN' : 'SIGN_UP_SIGN_IN';

  new B2CUserFlowAttribute(`${id}-b2c-user-flow-attribute`, {
    ...environment,
    displayName: 'ApprovedReadItems',
    dataType: 'string',
    description: 'Approved read items'
  });

  new B2CUserFlowAttribute(`${id}-b2c-user-flow-attribute-read`, {
    ...environment,
    displayName: 'ApprovedReadItems',
    dataType: 'string',
    description: 'Approved read items'
  });

  new B2CUserFlowAttribute(`${id}-b2c-user-flow-attribute-write`, {
    ...environment,
    displayName: 'ApprovedWriteItems',
    dataType: 'string',
    description: 'Approved write items'
  });

  new B2CUserFlowAttribute(`${id}-b2c-user-flow-attribute-role`, {
    ...environment,
    displayName: 'Role',
    dataType: 'string',
    description: 'Role & customer information'
  });

  const userFlow = new B2CUserFlow(`${id}-b2c-user-flow`, {
    ...environment,
    name: userFlowName,
    userFlowType: B2CUserFlowType.SignUpOrSignIn
  });

  return {
    apiAppId: apiB2CApplication.id,
    uiAppId: uiB2CApplication.id,
    apiClientId: apiB2CApplication.applicationClientId,
    apiClientSecret: apiB2CApplicationSecret.clientSecret,
    uiClientId: uiB2CApplication.applicationClientId,

    userFlowId: userFlow.id,
    scope: 'API.Access'
  };
};

export const setupRedirectURL = async (id: string, applicationId: Input<string>, redirectUrl: Input<string>) => {
  const environment = {
    clientId: config.require('b2c-client-id'),
    clientSecret: config.require('b2c-client-secret'),
    tenantId: config.require('b2c-tenant-id'),
    tenantDomainName: config.require('b2c-tenant-domain-name')
  };

  const replyUrls = all([redirectUrl]).apply(([url]) => [
    {
      url: url,
      type: ApplicationType.Spa
    },
    { url: 'http://localhost:5173/auth/redirect', type: ApplicationType.Spa }
  ]);

  new B2CApplicationRedirectConfiguration(`${id}-b2c-app-redirect`, {
    ...environment,
    applicationId,
    replyUrls
  });
};

export const setupAPIConnector = async (id: string, userFlowId: Input<string>, apiConnectorUrl: Input<string>) => {
  const environment = {
    clientId: config.require('b2c-client-id'),
    clientSecret: config.require('b2c-client-secret'),
    tenantId: config.require('b2c-tenant-id'),
    tenantDomainName: config.require('b2c-tenant-domain-name')
  };

  const username = new RandomString('random-username', { length: 12 });
  const password = new RandomPassword('random-password', { length: 12 });

  const apiConnector = new B2CAPIConnector(`${id}-b2c-app-api-connector`, {
    ...environment,
    displayName: `${project} ${stack} API Connector`,
    targetUrl: apiConnectorUrl,
    username: username.result,
    password: password.result
  });

  new B2CAPIConnectorConfiguration(`${id}-b2c-app-api-connector-configuration`, {
    ...environment,
    connectorId: apiConnector.id,
    connectorEvent: APIConnectorEvents.PreTokenIssuance,
    userFlowId: userFlowId
  });

  return {
    apiConnectorId: apiConnector.id
  };
};
