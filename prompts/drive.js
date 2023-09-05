// @ts-check

/** @type {import('caz').Template['prompts']}} */
module.exports = [
  {
    name: 'drive',
    type: 'confirm',
    message: 'You will need to setup or use an existing SharePoint group to store files. Continue?'
  },
  {
    name: 'tenantId',
    message: 'Tenant ID: The Tenant ID of the Azure AD application used to access the files.',
    type: 'text'
  },
  {
    name: 'clientId',
    message: 'Client ID: The Client ID of the Azure AD application used to access the files.',
    type: 'text'
  },
  {
    name: 'clientSecret',
    message: 'Client Secret: The client secret of the Azure AD application used to access the files.',
    type: 'password'
  },
  {
    name: 'driveId',
    message: 'Drive ID: The ID of the SharePoint drive to use.',
    type: 'text'
  }
];
