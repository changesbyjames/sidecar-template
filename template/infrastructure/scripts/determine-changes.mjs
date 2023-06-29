#!/usr/bin/env zx
import 'zx/globals';
import { publish } from './utils/index.mjs';

const directories = ['api', 'app'];
console.log(`FORCE_ALL: ${process.env.FORCE_ALL}`);
if (process.env.FORCE_ALL === 'True') {
  console.log('FORCE_ALL is set, all directories will be built');
  directories.forEach(dir => publish(`${dir.toUpperCase()}_CHANGED`, 'true'));
  process.exit(0);
}

const branch = process.env.BRANCH || 'main';
const definitionId = process.env.DEFINITION_ID;

if (!definitionId) {
  throw new Error('Missing DEFINITION_ID');
}

const sha = await (async () => {
  try {
    await $`az config set extension.use_dynamic_install=yes_without_prompt`;
    const output =
      await $`az pipelines build list --branch ${branch} --definition-ids ${definitionId} --result succeeded --top 1 --query "[0].triggerInfo.\"ci.sourceSha\""`;
    return output.stdout.replace(/"/g, '').trim();
  } catch (e) {
    const output = await $`git rev-parse HEAD`;
    return output.stdout.trim();
  }
})();
const output = await $`git diff --name-only ${sha}`;

const files = output.stdout.split('\n').filter(Boolean);
directories.forEach(dir => {
  if (files.some(x => x.startsWith(dir))) {
    console.log(`Changes detected in /${dir}`);
    publish(`${dir.toUpperCase()}_CHANGED`, 'true');
  }
});
