#!/usr/bin/env zx
import 'zx/globals';
import { publish } from './utils/index.mjs';
const output = await $`pulumi stack output --json`;
const outputs = JSON.parse(output.stdout);

for (const [key, value] of Object.entries(outputs)) {
  publish(key, value);
}
