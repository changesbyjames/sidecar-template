import { FastifyRequest } from 'fastify';
import { IncomingHttpHeaders, IncomingMessage } from 'http';
import { Http2ServerRequest } from 'http2';
import { AuthenticationConfig } from '../utils';
import { getToken } from '../utils/auth';

export const prepareRequestHeaders = async (auth: AuthenticationConfig) => {
  const token = await getToken(auth);
  return (req: IncomingMessage | Http2ServerRequest, headers: IncomingHttpHeaders): IncomingHttpHeaders => {
    if (!token) throw new Error('No token found');
    headers['authorization'] = `Bearer ${token.token}`;
    return headers;
  };
};

export const prepareResponseHeaders = (headers: IncomingHttpHeaders): IncomingHttpHeaders => {
  // Remove headers coming back from Microsoft Graph that we don't want to expose
  delete headers['strict-transport-security']; // Graph returns this header but we don't want to pin https.
  delete headers['Content-Security-Policy'];
  headers['Cache-Control'] = 'max-age=30'; // Cache for 30 seconds
  return headers;
};

export const preparePath = (request: FastifyRequest, prefix?: string): string => {
  const queryParamIndex = request.raw.url?.indexOf('?');
  let dest = request.raw.url?.slice(0, queryParamIndex !== -1 ? queryParamIndex : undefined) ?? '';
  if (prefix) dest = dest.replace(prefix, '');
  return dest;
};

import { Client } from '@microsoft/microsoft-graph-client';
import { DriveItem } from '@microsoft/microsoft-graph-types';

export interface TreeItem {
  id: string;
  parent?: string | null;
}

export interface Tree {
  items: Map<string, TreeItem>;
}

const ApprovedDrive = process.env.APPROVED_DRIVE;

const enrichNode = async (client: Client, tree: Tree, id: string) => {
  try {
    const item: DriveItem = await client.api(`/drives/${ApprovedDrive}/items/${id}`).get();
    const node: TreeItem = {
      id: id,
      parent: item.parentReference?.id
    };
    tree.items.set(id, node);
    return node;
  } catch (e) {
    throw new Error('This folder does not exist or you do not have permission to access it');
  }
};

const tree: Tree = {
  items: new Map<string, TreeItem>()
};

interface IsInFolderOptions {
  depth: number;
}

interface IsInFolderMeta {
  currentDepth: number;
  tree: Tree;
}

const createNewMeta = (): IsInFolderMeta => ({
  currentDepth: 0,
  tree: {
    items: new Map<string, TreeItem>()
  }
});

export const isInFolder = async (
  client: Client,
  id: string,
  folderIds: string | string[],
  options: IsInFolderOptions = { depth: Infinity },
  meta: IsInFolderMeta = createNewMeta()
): Promise<boolean> => {
  id = id.replace(':', '');
  if (!meta.tree)
    meta.tree = {
      items: new Map<string, TreeItem>()
    };

  if (typeof folderIds === 'string') folderIds = [folderIds];

  // STEP 1: See if the item we are looking for is just one of the folders we are looking in,
  // if it is, it is in the folder.
  if (folderIds.includes(id)) return true;

  // STEP 2: See if the current node is in the tree
  // If it is not, add it to the tree
  if (!meta.tree.items.has(id)) await enrichNode(client, meta.tree, id);

  // Get the current item from the tree (it should be there now)
  const item = meta.tree.items.get(id);
  if (!item) throw new Error('This should never happen, if it does, something is wrong.');

  // STEP 3: See if the current node's parent is the folder we are looking for
  // If it is, return true
  if (item.parent && folderIds.includes(item.parent)) return true;

  // STEP 4: If we have reached the depth limit, return false
  if (meta.currentDepth >= options.depth) return false;

  // STEP 5: If the current node has a parent, check if the parent is in the folder
  if (item.parent)
    return await isInFolder(client, item.parent, folderIds, options, { ...meta, currentDepth: meta.currentDepth + 1 });

  // STEP 6: If we have reached this point, the item is not in the folder
  return false;
};
