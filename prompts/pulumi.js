// @ts-check

// Regex for no whitespace:
const OnlyAlphaNumeric = /^[a-zA-Z0-9]+$/;

const PulumiDefaults = {
  resourceGroup: 'central-pulumi-store',
  storageAccount: 'centralpulumistore',
  keyVault: 'central-pulumi-kv'
};

/** @type {import('caz').Template['prompts']}} */
module.exports = [
  {
    name: 'custom',
    type: 'confirm',
    message: `Are you currently going to deploy this in a customer's Azure subscription?`
  },
  {
    name: 'resourceGroup',
    type: (_, answers) => (answers.custom ? 'text' : null),
    message:
      'To setup Pulumi you need to create the keyvault and storage account to store the state. What is the central resource group?',
    initial: PulumiDefaults.resourceGroup
  },
  {
    name: 'storageAccount',
    type: (_, answers) => (answers.custom ? 'text' : null),
    message: 'What is the storage account name?',
    initial: PulumiDefaults.storageAccount
  },
  {
    name: 'keyVault',
    type: (_, answers) => (answers.custom ? 'text' : null),
    message: 'What is the keyvault name?',
    initial: PulumiDefaults.keyVault
  },
  {
    name: 'permissions',
    type: 'confirm',
    message: (_, answers) =>
      `Watch this video and complete the steps: https://streamable.com/2q2q2q (storage account: "${
        answers.storageAccount ?? PulumiDefaults.storageAccount
      }", key vault: "${answers.keyVault ?? PulumiDefaults.keyVault}", name: "${answers.name}"). Continue?`
  },
  {
    name: 'creationOfContainer',
    type: 'confirm',
    message: (_, answers) =>
      `Create a "${answers.name}" container in the "${
        answers.storageAccount ?? PulumiDefaults.storageAccount
      }" storage account. Continue?`
  },
  {
    name: 'creationOfKey',
    type: 'confirm',
    message: (_, answers) =>
      `Create a "${answers.name}" key in the "${answers.keyVault ?? PulumiDefaults.keyVault}" key vault. Continue?`
  }
];
