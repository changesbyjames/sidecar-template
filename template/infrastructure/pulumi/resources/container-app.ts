import { ManagedEnvironment, ContainerApp } from '@pulumi/azure-native/app';
import { ResourceGroup } from '@pulumi/azure-native/resources';
import { interpolate, Output } from '@pulumi/pulumi';

interface ImageDefinition {
  registry: {
    server: string;
    username: string;
    password: string;
  };
  name: string;
  tag: string;
}

interface ScaleOptions {
  minReplicas: number;
  maxReplicas: number;
  noOfRequestsPerInstance: string;
}

export default async (
  id: string,
  group: ResourceGroup,
  environment: ManagedEnvironment,
  port: number,
  image: ImageDefinition,
  scale: ScaleOptions,
  env: Record<string, Output<string> | string>
) => {
  const api = new ContainerApp(`${id}-${image.name}`, {
    resourceGroupName: group.name,
    managedEnvironmentId: environment.id,
    configuration: {
      ingress: {
        external: true,
        targetPort: port
      },
      registries: [
        {
          server: image.registry.server,
          username: image.registry.username,
          passwordSecretRef: 'pwd'
        }
      ],
      secrets: [{ name: 'pwd', value: image.registry.password }]
    },
    template: {
      containers: [
        {
          name: image.name,
          image: `${image.registry.server}/${image.name}:${image.tag}`,
          resources: {
            cpu: 1,
            memory: '2.0Gi'
          },
          env: [
            ...Object.entries(env).map(([name, value]) => ({ name, value })),
            {
              name: 'NODE_ENV',
              value: 'production'
            },
            {
              name: 'PORT',
              value: port.toString()
            },
            {
              name: 'HOST',
              value: '0.0.0.0'
            }
          ]
        }
      ],
      scale: {
        maxReplicas: scale.maxReplicas,
        minReplicas: scale.minReplicas,
        rules: [
          {
            custom: {
              metadata: {
                concurrentRequests: scale.noOfRequestsPerInstance
              },
              type: 'http'
            },
            name: 'httpscalingrule'
          }
        ]
      }
    }
  });
  return { containerAppURL: interpolate`https://${api.name}.${environment.defaultDomain}` };
};
