// @ts-check

const { optional } = require('./utils');

/** @type {import('caz').Template['prompts']}} */
module.exports = [
  {
    name: 'api',
    type: 'confirm',
    message:
      'Do you need to use the API? i.e. to use other accounts than Office 365 accounts, to add extra permissions or to add additional functionality like webhooks.'
  },
  {
    name: 'components',
    type: (_, answers) => (answers.api ? 'multiselect' : null),
    message: 'Which API components do you need?',
    choices: [
      {
        title: 'Graph Proxy',
        value: 'proxy',
        selected: true,
        description:
          'A proxy to the Microsoft Graph API that allows you to use other accounts than Office 365 accounts.'
      },
      {
        title: 'Webhooks',
        value: 'webhooks',
        selected: false,
        description: 'Functionality to register a webhook and react to changes in the OneDrive share.'
      },
      {
        title: 'B2C Auth',
        value: 'auth',
        selected: true,
        description: 'Authentication using Azure AD B2C.'
      }
    ]
  },
  {
    name: 'authOptions',
    type: (_, answers) => (answers.components?.includes('auth') ? 'multiselect' : null),
    message: 'Which authentication options do you need?',
    choices: [
      {
        title: 'Customer folders',
        value: 'customerFolders',
        description: 'Allow users to sign in to the app.'
      },
      {
        title: 'Shared folders',
        value: 'sharedFolders',
        description: 'Allow users to sign in to the app.'
      },
      {
        title: 'Email domain allowlist',
        value: 'allowlist',
        description: 'Allow users to sign in to the app.'
      },
      {
        title: 'Email domain admin list',
        value: 'admin',
        description: 'Allow users to sign in to the app.'
      },
      {
        title: 'Public access to shared folders',
        value: 'publicAccess',
        description: 'Allow users to sign in to the app.'
      }
    ]
  }
];
