#!/usr/bin/env zx
import 'zx/globals';
import { spawn } from 'child_process';

const SUBSCRIPTION = 'be713777-6e12-4b6b-8ff3-1cd7ec98d6e4';
const GROUP = '<%= resourceGroup %>';
const ACCOUNT = '<%= storageAccount %>';
const KEY_VAULT = '<%= keyVault%>';

const INFRA_PATH = 'infrastructure/pulumi';

const TO_INCLUDE_SECRET_PROVIDER = [['stack', 'init'], ['new']];

console.log(`Performing custom bootstrap of Pulumi for subscription ${SUBSCRIPTION} in group ${GROUP}`);

try {
  const version = await quiet($`pulumi version`);
  console.log(`Pulumi version: ${version}`);
} catch (e) {
  console.log('Please install Pulumi & run this command again.');
  console.log('You can find details here: https://www.pulumi.com/docs/get-started/install/');
}

try {
  const output = await quiet($`az version`);
  const versions = JSON.parse(output);
  console.log(`az cli version: ${versions['azure-cli']}`);
} catch {
  console.log('Please install az cli & run this command again.');
  console.log('You can find details here: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli');
}

const name = '<%= name %>';
cd(INFRA_PATH);

process.env.AZURE_KEYVAULT_AUTH_VIA_CLI = 'true';

try {
  await quiet($`pulumi login azblob://${name}?storage_account=${ACCOUNT}`);
  const includeSecretProvider = TO_INCLUDE_SECRET_PROVIDER.some(
    ([command, subcommand]) => argv._.includes(command) && (subcommand ? argv._.includes(subcommand) : true)
  );

  const flags = Object.entries(argv).reduce((acc, [key, value]) => {
    if (key === '_') return acc;
    if (value) acc.push(`--${key}`);
    return acc;
  }, []);

  const command = [
    ...argv['_'],
    flags,
    includeSecretProvider ? `--secrets-provider="azurekeyvault://${KEY_VAULT}.vault.azure.net/keys/${name}"` : ''
  ];
  console.log(`Running: pulumi ${command.join(' ')}`);
  spawn('pulumi', command, {
    stdio: 'inherit',
    shell: true,
    detached: true,
    cwd: path.resolve('./')
  });
} catch (e) {
  console.error(e);
  console.log(`You don't have access to the central state store. Please contact Craig or James to figure this out.`);
}
