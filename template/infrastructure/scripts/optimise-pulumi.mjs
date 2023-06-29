#!/usr/bin/env zx
import 'zx/globals';
import { readdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';

const rootFolder = join(__dirname, '../pulumi', `node_modules/@pulumi/azure-native`);
const enumsFolder = `${rootFolder}/types/enums`;

const modulesToKeep = ['resources', 'storage', 'types', 'cdn', 'operationalinsights', 'app', 'insights'];
const enablePreviewFor = ['insights'];

async function getPreviousVersionFolders(path) {
  if (enablePreviewFor.includes(path.split('/').pop())) {
    return [];
  }
  const moduleFolders = await getFolderNames(path);
  return moduleFolders
    .filter(x => {
      const match = x.match(/v\d{8}(?:preview)?$/);
      return match && match.length === 1;
    })
    .map(x => [path, x].join('/'));
}

async function getFolderNames(path) {
  const dirents = await readdir(path, {
    withFileTypes: true
  });

  return dirents.filter(x => x.isDirectory()).map(x => x.name);
}

async function getFolders(rootPath) {
  const modules = await getFolderNames(rootPath);

  const foldersPromises = modules.map(async module => {
    const moduleFolderPath = [rootPath, module].join('/');
    if (modulesToKeep.includes(module)) {
      return await getPreviousVersionFolders(moduleFolderPath);
    }
    return moduleFolderPath;
  });

  const moduleFolders = await Promise.all(foldersPromises);
  return moduleFolders.flat();
}

async function getFoldersToClean() {
  const getFoldersPromises = [rootFolder, enumsFolder].map(getFolders);
  const folders = await Promise.all(getFoldersPromises);
  return folders.flat();
}

async function cleanFoldersAsync() {
  const folders = await getFoldersToClean();

  const removeTasks = await Promise.all(
    folders.map(async folder => {
      const files = await readdir(folder, {
        withFileTypes: true
      });

      return files.map(file => {
        const path = `${folder}/${file.name}`;
        return rm(path, {
          recursive: true,
          force: true
        });
      });
    })
  );

  const removeTasksFlattened = removeTasks.flat();
  await Promise.all(removeTasksFlattened);

  await Promise.all(
    folders.map(async folder => {
      const newIndexFile = [folder, 'index.js'].join('/');
      try {
        await writeFile(newIndexFile, 'Object.defineProperty(exports, "__esModule", { value: true });');
      } catch (e) {
        console.log(`Failed to create index.js in ${folder}`);
      }
    })
  );
}

await cleanFoldersAsync();
