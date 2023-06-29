#!/usr/bin/env zx
import 'zx/globals';

const currentBuildId = process.env.BUILD_ID;
const containerRegistry = process.env.CONTAINER_REGISTRY;

if (!currentBuildId) throw new Error('No build id found');
if (!containerRegistry) throw new Error('No container registry found');

const output = await $`az acr repository show-tags --name ${containerRegistry} --repository api --orderby time_desc`;
const tags = JSON.parse(output.stdout);

const latestTag = tags[0];
if (!latestTag) throw new Error('No tags found');

if (latestTag === currentBuildId) {
  // If the latest tag is the current build id, then we're good to go
  await $`pulumi config set build-id ${currentBuildId}`;
  process.exit(0);
}

// Find the tag that is numerically before the current build id
const previousTag = tags.find(tag => Number(tag) < Number(currentBuildId));
if (!previousTag) {
  throw new Error(`No appropriate tag found for ${currentBuildId}`);
}

// Set the build id to the previous tag
await $`pulumi config set build-id ${previousTag}`;
