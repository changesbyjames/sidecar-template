// @ts-check

const PulumiDefaults = {
  resourceGroup: 'central-pulumi-store',
  storageAccount: 'centralpulumistore',
  keyVault: 'central-pulumi-kv'
};

/** @type {import('caz').Template['prompts']}} */
module.exports = [
  {
    name: 'resourceGroup',
    type: 'text',
    message:
      'To setup Pulumi you need to create the keyvault and storage account to store the state. What is the central resource group?',
    initial: PulumiDefaults.resourceGroup
  },
  {
    name: 'storageAccount',
    type: 'text',
    message: 'What is the storage account name?',
    initial: PulumiDefaults.storageAccount
  },
  {
    name: 'keyVault',
    type: 'text',
    message: 'What is the keyvault name?',
    initial: PulumiDefaults.keyVault
  },
  {
    name: 'creationOfContainer',
    type: 'confirm',
    message: (_, answers) =>
      `Create a "${answers.name}" container in the "${answers.storageAccount}" storage account. Continue?`
  },
  {
    name: 'creationOfKey',
    type: 'confirm',
    message: (_, answers) => `Create a "${answers.name}" key in the "${answers.keyVault}" key vault. Continue?`
  }
];
