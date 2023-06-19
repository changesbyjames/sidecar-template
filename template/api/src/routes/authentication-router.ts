import { Client } from '@microsoft/microsoft-graph-client';
import { DriveItem } from '@microsoft/microsoft-graph-types';
import { FastifyInstance } from 'fastify';
import fetch from 'node-fetch';
import b2cAuthentication, { AuthenticationEnrichmentResponse } from '../plugins/authentication';
import { SidecarFile } from '@sidecarcms/core';
import { isDomainOnAdminList, isDomainOnAllowlist } from '../helpers/authentication';

interface Response<T> {
  '@odata.context': string;
  value: T[];
}

const getCustomerFolders = async (client: Client) => {
  const customerFolderId = process.env.CUSTOMER_FOLDER_ID;
  if (!customerFolderId) throw new Error('CUSTOMER_FOLDER_ID is missing');

  const folders: Response<Required<Pick<DriveItem, 'id' | 'name' | 'folder'>>> = await client
    .api(`/drives/${process.env.APPROVED_DRIVE}/items/${customerFolderId}/children`)
    .select('id,name,folder')
    .get();

  return folders.value.filter(folder => folder.folder);
};

const getEmailsInCustomerFolder = async (client: Client, id: string): Promise<string[]> => {
  try {
    const file: { '@microsoft.graph.downloadUrl': string } = await client
      .api(`/drives/${process.env.APPROVED_DRIVE}/items/${id}:/Users.sidecar`)
      .select('content.downloadUrl')
      .get();

    const response = await fetch(file['@microsoft.graph.downloadUrl']);
    const content = await response.json();
    const users = content as SidecarFile<{ emails: string[] }>;
    if (!users?.data?.emails) return [];
    return users.data.emails;
  } catch (e) {
    return [];
  }
};

const AccessCache = new Map<string, string[]>();

const getCustomerFoldersByEmail = async (email: string, client: Client): Promise<string[]> => {
  const customers = await getCustomerFolders(client);

  const updateCacheProcess = Promise.all(
    customers.map(async customer => {
      const emails = await getEmailsInCustomerFolder(client, customer.id);
      emails.forEach(email => {
        if (!AccessCache.has(email)) {
          AccessCache.set(email, [customer.id]);
          return;
        }

        const ids = AccessCache.get(email);
        if (!ids) throw new Error('No ids');
        if (!ids.includes(customer.id)) ids.push(customer.id);

        AccessCache.set(email, ids);
      });
    })
  );

  if (AccessCache.has(email)) {
    const ids = AccessCache.get(email);
    if (!ids) throw new Error('No ids');
    return ids;
  }

  await updateCacheProcess;
  return AccessCache.get(email) || [];
};

export default async function register(router: FastifyInstance) {
  router.register(b2cAuthentication, {
    prefix: '/auth',
    handler: async (email, client) => {
      try {
        const reads = [];
        const writes = [];
        const roles = [];

        <% if (authOptions.includes('customerFolders')) { %>
        // Authorization Criteria: An associated customer folder
        // This is a folder that the user's email is listed in the Users.sidecar file
        const associatedCustomerFolders = await getCustomerFoldersByEmail(email, client);
        reads.push(...associatedCustomerFolders);
        writes.push(...associatedCustomerFolders);
        roles.push(associatedCustomerFolders.map(id => `CUSTOMER:${id}`));
        <% } %>

        <% if (authOptions.includes('sharedFolders')) { %>
        // Authorization Criteria: Anonymous read/write folders
        // These are folders that are configured in the environment variables
        if (process.env.ANONYMOUS_READ_FOLDERS) {
          const folders = process.env.ANONYMOUS_READ_FOLDERS.split(',');
          reads.push(...folders);
        }

        if (process.env.ANONYMOUS_WRITE_FOLDERS) {
          const folders = process.env.ANONYMOUS_WRITE_FOLDERS.split(',');
          writes.push(...folders);
        }
        <% } %>

        <% if (authOptions.includes('allowlist')) { %>
        // Authorization Criteria: Allowlist
        // This is a list of domains that are allowed to login to the application
        // This doesn't grant any specific access to customer folders but it does grant access to the application & anonymous folders
        if (isDomainOnAllowlist(email)) {
          roles.unshift('ANONYMOUS');
        }
        <% } %>

        <% if (authOptions.includes('admin')) { %>
        // Authorization Criteria: Admin list
        // This is a list of domains that are allowed to login to the application as an admin
        // This grants access to the application, anonymous folders & all customer folders
        if (isDomainOnAdminList(email)) {
          roles.unshift('ADMIN');
          const folders = await getCustomerFolders(client);
          reads.push(...folders.map(folder => folder.id));
          writes.push(...folders.map(folder => folder.id));
        }
        <% } %>

        <% if (!authOptions.includes('publicAccess')) { %>
        // Authorization Criteria: No roles
        // This is a catch all for any login attempt that doesn't meet any of the above criteria
        if (roles.length === 0) throw new Error('A login attempt was made but no roles were found');
        <% } %>

        const claims: AuthenticationEnrichmentResponse[] = [
          { id: 'extension_ApprovedReadItems', value: reads.join(',') },
          { id: 'extension_ApprovedWriteItems', value: writes.join(',') },
          { id: 'extension_Role', value: roles.join(',') }
        ];
        return claims;
      } catch (e) {
        // If anything fails in the process ensure that no extra claims are granted.
        // This can be failures we have knowledge about e.g. no authorization criteria reached or failures we don't know about e.g. network failure.
        return [];
      }
    }
  });
}
