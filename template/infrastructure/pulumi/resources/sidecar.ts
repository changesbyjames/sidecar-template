import { Config, interpolate, Output } from '@pulumi/pulumi';
import { OneDriveFile } from './graph/OneDriveFile';
import { OneDriveFolder } from './graph/OneDriveFolder';
import { readFile } from 'fs/promises';
import { readJSON } from 'fs-extra';
import { join, resolve } from 'path';
import { GraphCreds } from './onedrive';

type SidecarManifest = Record<string, { path: string }>;
export default async (id: string, creds: GraphCreds) => {
  const config = new Config();

  const sidecarFolder = new OneDriveFolder(`${id}-sidecar-folder`, {
    ...creds,
    name: 'System'
  });

  const sidecarTemplatesFolder = new OneDriveFolder(`${id}-sidecar-templates-folder`, {
    ...creds,
    folderId: sidecarFolder.id,
    name: 'Templates'
  });

  const SIDECAR_DIST_DIR = '../../../../sidecar';
  const manifestLocation = resolve(__dirname, join(SIDECAR_DIST_DIR, `manifest.json`));
  console.log(manifestLocation);
  const buildManifest: SidecarManifest = await readJSON(manifestLocation);

  const templates = await Promise.all(
    Object.entries(buildManifest).map(async ([name, { path }]) => {
      return [name, await readFile(resolve(__dirname, join(SIDECAR_DIST_DIR, path)))] as const;
    })
  );
  const manifest = templates.reduce((manifest, [name, template]) => {
    const templateId = name.toLowerCase();
    const file = new OneDriveFile(`${id}-sidecar-file-${templateId}`, {
      ...creds,
      folderId: sidecarTemplatesFolder.id,
      name: `${templateId}.template.json`,
      content: template.toString()
    });
    manifest[name] = {
      path: interpolate`onedrive://drives/${creds.driveId}/items/${file.id}/content`
    };
    return manifest;
  }, {} as Record<string, { path: Output<string> }>);

  return {
    sidecarFolderId: sidecarFolder.id,
    templateFolder: sidecarTemplatesFolder.id,
    manifest: manifest
  };
};
