import { CustomResourceOptions, Input, Output, dynamic } from '@pulumi/pulumi';
import { checkForChanges, createOrGetClient } from './shared';

export interface OneDriveFolderInputs {
  clientId: Input<string>;
  clientSecret: Input<string>;
  tenantId: Input<string>;

  name: Input<string>;
  driveId: Input<string>;
  folderId?: Input<string>;
}

interface OneDriveFolderProviderInputs {
  clientId: string;
  clientSecret: string;
  tenantId: string;

  name: string;
  driveId: string;
  folderId?: string;
}

interface OneDriveFolderProviderOutputs {
  clientId: string;
  clientSecret: string;
  tenantId: string;

  id: string;

  name: string;
  driveId: string;
  folderId?: string;
}

const OneDriveFolderProvider: dynamic.ResourceProvider = {
  async create(inputs: OneDriveFolderProviderInputs) {
    const { tenantId, clientId, clientSecret, driveId, folderId, name } = inputs;
    const client = createOrGetClient(clientId, clientSecret, tenantId);
    const { id } = await client
      .api(`/drives/${driveId}${folderId ? `/items/${folderId}` : '/root'}/children`)
      .header('Content-Type', 'application/json')
      .post({
        name,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename'
      });

    const outs: Omit<OneDriveFolderProviderOutputs, 'id'> = {
      tenantId,
      clientId,
      clientSecret,
      driveId,
      name
    };

    if (folderId) outs.folderId = folderId;

    return {
      id,
      outs
    };
  },
  async update(id: string, olds: OneDriveFolderProviderOutputs, news: OneDriveFolderProviderInputs) {
    const client = createOrGetClient(olds.clientId, olds.clientSecret, olds.tenantId);

    await client.api(`/drives/${olds.driveId}/items/${id}`).patch({
      name: news.name
    });

    return {
      outs: {
        ...olds,
        name: news.name
      }
    };
  },
  async diff(id: string, olds: OneDriveFolderProviderOutputs, news: OneDriveFolderProviderInputs) {
    const result: dynamic.DiffResult = {
      stables: ['tenantId', 'clientId', 'clientSecret', 'driveId', 'folderId'],
      deleteBeforeReplace: false
    };

    type Keys = keyof OneDriveFolderProviderOutputs;
    const deltas = checkForChanges<Keys>(olds, news, ['name']);
    const replaces = checkForChanges<Keys>(olds, news, ['tenantId', 'clientId', 'clientSecret', 'driveId', 'folderId']);

    return {
      ...result,
      replaces: replaces,
      changes: deltas.length > 0 || replaces.length > 0
    };
  },
  async delete(id, { tenantId, clientId, clientSecret, driveId }) {
    const client = createOrGetClient(clientId, clientSecret, tenantId);
    await client.api(`/drives/${driveId}/items/${id}`).delete();
  }
};

export class OneDriveFolder extends dynamic.Resource {
  public readonly id!: Output<string>;

  constructor(name: string, props: OneDriveFolderInputs, opts?: CustomResourceOptions) {
    super(OneDriveFolderProvider, name, { ...props }, { ...opts, additionalSecretOutputs: ['clientSecret'] });
  }
}
