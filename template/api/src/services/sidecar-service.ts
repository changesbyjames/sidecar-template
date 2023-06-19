import { Client } from '@microsoft/microsoft-graph-client';
import { SidecarFile, createFileFromOneDrive, readManifest } from '@sidecarcms/core';

if (!process.env.SIDECAR_MANIFEST) throw new Error('No process.env.SIDECAR_MANIFEST found');
export const manifest = JSON.parse(process.env.SIDECAR_MANIFEST);

export const createCustomerSidecarFile = async (client: Client, driveId: string, folderId: string) => {
  const file = await createFileFromOneDrive(
    manifest,
    'Customer',
    'Customer',
    'The names, industry information, and other contact information for your customers',
    {},
    client
  );

  return await uploadJSON(client, driveId, folderId, file, 'Customer.sidecar');
};

export const createUsersSidecarFile = async (
  client: Client,
  driveId: string,
  folderId: string,
  name?: string | null
) => {
  const folderDescription = name ? `the "${name}" folder` : 'this folder';
  const file = await createFileFromOneDrive(
    manifest,
    'Users',
    'Manage people',
    `These are the email addresses of the people that can access the documents in ${folderDescription}. Add, remove or change email address below.`,
    {},
    client
  );

  return await uploadJSON(client, driveId, folderId, file, 'Users.sidecar');
};

export const createCategorySidecarFile = async (client: Client, driveId: string, folderId: string) => {
  const file = await createFileFromOneDrive(
    manifest,
    'Category',
    'Category',
    'The details, cover image and name of your categories',
    {},
    client
  );

  return await uploadJSON(client, driveId, folderId, file, 'Category.sidecar');
};

export const createSectionSidecarFile = async (client: Client, driveId: string, folderId: string) => {
  const file = await createFileFromOneDrive(
    manifest,
    'Category',
    'Section',
    'The details, cover image and name of your sections',
    {},
    client
  );

  return await uploadJSON(client, driveId, folderId, file, 'Section.sidecar');
};

export const uploadJSON = async (
  client: Client,
  driveId: string,
  folderId: string,
  file: SidecarFile,
  name: string
) => {
  return await client
    .api(`/drives/${driveId}/items/${folderId}/children/${name}/content`)
    .headers({ 'Content-Type': 'application/json' })
    .put(JSON.stringify(file));
};
