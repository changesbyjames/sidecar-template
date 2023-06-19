// @ts-check

/** @type {import('caz').Template['prompts']}} */
module.exports = [
  {
    name: 'drive',
    type: 'confirm',
    message:
      'You will need to setup or use an existing SharePoint group to store files. See here to use the existing development share: https://streamable.com/2q2q2q. or here to set up a new one: https://streamable.com/2q2q2q. Continue?'
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
