import { OneDriveFolder } from './graph/OneDriveFolder';

type SidecarManifest = Record<string, { path: string }>;
export interface GraphCreds {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  driveId: string;
}

export default async (id: string, creds: GraphCreds) => {
  const sharedResourceFolder = new OneDriveFolder(`${id}-shared-folder`, {
    ...creds,
    name: 'Shared'
  });

  const customerFolder = new OneDriveFolder(`${id}-customers-folder`, {
    ...creds,
    name: 'Customers'
  });

  return {
    sharedResourceFolderId: sharedResourceFolder.id,
    customerFolderId: customerFolder.id
  };
};
