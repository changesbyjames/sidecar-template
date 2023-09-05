import { dynamic, Input, Output, CustomResourceOptions } from '@pulumi/pulumi';
import { checkForChanges, createOrGetClient } from './shared';

export interface OneDriveFileInputs {
  clientId: Input<string>;
  clientSecret: Input<string>;
  tenantId: Input<string>;

  name: Input<string>;
  content: Input<string>;
  driveId: Input<string>;
  folderId?: Input<string>;
}

interface OneDriveFileProviderInputs {
  clientId: string;
  clientSecret: string;
  tenantId: string;

  name: string;
  content: string;
  driveId: string;
  folderId?: string;
}

interface OneDriveFileProviderOutputs {
  clientId: string;
  clientSecret: string;
  tenantId: string;

  id: string;

  name: string;
  content: string;
  driveId: string;
  folderId?: string;
}

const OneDriveFileProvider: dynamic.ResourceProvider = {
  async create({ tenantId, clientId, clientSecret, driveId, folderId, name, content }: OneDriveFileProviderInputs) {
    const client = createOrGetClient(clientId, clientSecret, tenantId);
    const { id } = await client
      .api(`/drives/${driveId}${folderId ? `/items/${folderId}:` : '/root:'}/${encodeURIComponent(name)}:/content`)
      .header('Content-Type', 'application/json')
      .put(content);

    const outs: Omit<OneDriveFileProviderOutputs, 'id'> = {
      tenantId,
      clientId,
      clientSecret,
      driveId,
      name,
      content
    };

    if (folderId) outs.folderId = folderId;

    return {
      id,
      outs
    };
  },
  async update(id: string, olds: OneDriveFileProviderOutputs, news: OneDriveFileProviderInputs) {
    const client = createOrGetClient(olds.clientId, olds.clientSecret, olds.tenantId);
    await client
      .api(`/drives/${olds.driveId}/items/${id}/content`)
      .header('Content-Type', 'application/json')
      .put(news.content);

    await client.api(`/drives/${olds.driveId}/items/${id}`).patch({
      name: news.name
    });

    return {
      outs: {
        ...olds,
        name: news.name,
        content: news.content
      }
    };
  },
  async diff(id: string, olds: OneDriveFileProviderOutputs, news: OneDriveFileProviderInputs) {
    const result: dynamic.DiffResult = {
      stables: [],
      deleteBeforeReplace: false
    };

    type Keys = keyof OneDriveFileProviderOutputs;
    const deltas = checkForChanges<Keys>(olds, news, ['name', 'content']);

    const replaces = checkForChanges<Keys>(olds, news, ['tenantId', 'clientId', 'clientSecret', 'driveId', 'folderId']);

    return {
      ...result,
      replaces,
      changes: deltas.length > 0 || replaces.length > 0
    };
  },
  async delete(id, { tenantId, clientId, clientSecret, driveId }) {
    const client = createOrGetClient(clientId, clientSecret, tenantId);
    await client.api(`/drives/${driveId}/items/${id}`).delete();
  }
};

export class OneDriveFile extends dynamic.Resource {
  public readonly id!: Output<string>;

  constructor(name: string, props: OneDriveFileInputs, opts?: CustomResourceOptions) {
    super(
      OneDriveFileProvider,
      name,
      { pem: undefined, ...props },
      { ...opts, additionalSecretOutputs: ['clientSecret'] }
    );
  }
}
