import { Config, Output } from '@pulumi/pulumi';
import { ResourceGroup } from '@pulumi/azure-native/resources';
import { StringAsset } from '@pulumi/pulumi/asset';
import {
  StorageAccount,
  StorageAccountStaticWebsite,
  Blob,
  SkuName as StorageSkuName,
  Kind,
  BlobServiceProperties
} from '@pulumi/azure-native/storage';
import { Profile, Endpoint, SkuName, QueryStringCachingBehavior, RedirectType } from '@pulumi/azure-native/cdn';
import { cdn } from '@pulumi/azure-native/types/input';

export default async (id: string, group: ResourceGroup, backstageConfigurationFile: Output<StringAsset>) => {
  const simpleId = id.replace(/-/g, '');
  const profile = new Profile(`${id}-profile`, {
    resourceGroupName: group.name,
    location: 'global',
    sku: {
      name: SkuName.Standard_Microsoft
    }
  });

  const storageAccount = new StorageAccount(simpleId, {
    enableHttpsTrafficOnly: true,
    kind: Kind.StorageV2,
    resourceGroupName: group.name,
    sku: {
      name: StorageSkuName.Standard_LRS
    }
  });

  new BlobServiceProperties(`${simpleId}-blob-service-properties`, {
    accountName: storageAccount.name,
    blobServicesName: 'default',
    resourceGroupName: group.name,
    cors: {
      corsRules: [
        {
          allowedHeaders: ['*'],
          allowedMethods: ['GET'],
          allowedOrigins: ['*'],
          exposedHeaders: ['*'],
          maxAgeInSeconds: 3600
        }
      ]
    }
  });

  const staticWebsite = new StorageAccountStaticWebsite(`${id}-static`, {
    accountName: storageAccount.name,
    resourceGroupName: group.name,
    indexDocument: 'index.html',
    error404Document: '404.html'
  });

  new Blob(`${id}-backstage-index`, {
    blobName: 'backstage.json',
    resourceGroupName: group.name,
    accountName: storageAccount.name,
    containerName: staticWebsite.containerName,
    source: backstageConfigurationFile,
    contentType: 'application/json'
  });

  const endpointOrigin = storageAccount.primaryEndpoints.apply(ep => ep.web.replace('https://', '').replace('/', ''));

  const enforceHTTPSRule: cdn.DeliveryRuleArgs = {
    name: 'EnforceHTTPS',
    order: 1,
    conditions: [
      {
        name: 'RequestScheme',
        parameters: {
          matchValues: ['HTTP'],
          operator: 'Equal',
          negateCondition: false,
          transforms: [],
          odataType: '#Microsoft.Azure.Cdn.Models.DeliveryRuleRequestSchemeConditionParameters'
        }
      }
    ],
    actions: [
      {
        name: 'UrlRedirect',
        parameters: {
          redirectType: RedirectType.Found,
          destinationProtocol: 'Https',
          odataType: '#Microsoft.Azure.Cdn.Models.DeliveryRuleUrlRedirectActionParameters'
        }
      }
    ]
  };

  const spaRewriteRule: cdn.DeliveryRuleArgs = {
    name: 'SPARewrite',
    order: 2,
    conditions: [
      {
        name: 'UrlFileExtension',
        parameters: {
          operator: 'GreaterThan',
          negateCondition: true,
          matchValues: ['0'],
          transforms: [],
          odataType: '#Microsoft.Azure.Cdn.Models.DeliveryRuleUrlFileExtensionMatchConditionParameters'
        }
      }
    ],
    actions: [
      {
        name: 'UrlRewrite',
        parameters: {
          sourcePattern: '/',
          destination: '/index.html',
          preserveUnmatchedPath: false,
          odataType: '#Microsoft.Azure.Cdn.Models.DeliveryRuleUrlRewriteActionParameters'
        }
      }
    ]
  };

  const endpoint = new Endpoint(`${id}-endpoint`, {
    endpointName: storageAccount.name.apply(sa => `cdn-endpnt-${sa}`),
    location: 'global',
    isHttpAllowed: false,
    isHttpsAllowed: true,
    originHostHeader: endpointOrigin,
    origins: [
      {
        hostName: endpointOrigin,
        httpsPort: 443,
        name: 'origin-storage-account'
      }
    ],
    profileName: profile.name,
    queryStringCachingBehavior: QueryStringCachingBehavior.NotSet,
    resourceGroupName: group.name,
    deliveryPolicy: {
      rules: [enforceHTTPSRule, spaRewriteRule]
    }
  });

  return {
    endpoint: endpoint.hostName.apply(hn => `https://${hn}`),
    resourceGroupName: group.name,
    accountName: storageAccount.name,
    containerName: staticWebsite.containerName,
    endpointName: endpoint.name,
    profileName: profile.name
  };
};
