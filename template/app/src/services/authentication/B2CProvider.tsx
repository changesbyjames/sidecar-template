import { AccountInfo, InteractionRequiredAuthError, PublicClientApplication } from '@azure/msal-browser';
import { useVariable } from '@softwareimaging/backstage';
import { FC, PropsWithChildren, useMemo } from 'react';
import { createStore } from 'zustand';
import { Variables } from '../backstage/config';
import {
  Account,
  AuthenticationContext,
  AuthenticationInformation,
  AuthenticationStatus,
  AuthenticationStore
} from './AuthenticationProvider';

const getAccountDetails = (account: AccountInfo): Account => {
  const claims = account.idTokenClaims as Record<string, string | string[]>;
  if (!claims) throw new Error('Invalid claims');
  const id = claims.sub as string;
  const firstName = claims.given_name as string;
  const lastName = claims.family_name as string;
  const [email] = claims.emails as string[];

  if (!id || !firstName || !lastName || !email) throw new Error('Invalid account');

  return {
    id,
    firstName,
    lastName,
    email,
    claims
  };
};

const restoreAuthentication = (instance: PublicClientApplication): AuthenticationInformation => {
  const [account] = instance.getAllAccounts();
  if (account) {
    return {
      account: getAccountDetails(account),
      status: AuthenticationStatus.Authenticated
    };
  }

  return {
    status: AuthenticationStatus.NotAuthenticated
  };
};

export const AuthenticationProvider: FC<PropsWithChildren> = ({ children }) => {
  const clientId = useVariable<Variables>('clientId');
  const policy = useVariable<Variables>('policy');
  const authority = useVariable<Variables>('authority');
  const tenant = useVariable<Variables>('tenant');
  const apiClientId = useVariable<Variables>('apiClientId');
  const apiScope = useVariable<Variables>('apiScope');

  if (!clientId || !policy || !authority) throw new Error('Missing configuration');

  const instance = useMemo(() => {
    return new PublicClientApplication({
      auth: {
        clientId,
        authority: `${authority}/${tenant}/${policy}`,
        knownAuthorities: [authority],
        redirectUri: `${window.location.origin}/auth/redirect`,
        postLogoutRedirectUri: `${window.location.origin}/auth/signout/redirect`,
        navigateToLoginRequestUrl: false
      },
      cache: {
        // It is GDPR compliant to use sessionStorage instead of localStorage here.
        // If you need to persist the login, you can use localStorage instead but you will need to
        // add a consent dialog to your application. This can be as simple as a checkbox that says
        // "Remember me".
        cacheLocation: 'sessionStorage'
      }
    });
  }, [authority, clientId, policy, tenant]);

  const store = useMemo(
    () =>
      createStore<AuthenticationStore>((set, get) => ({
        ...restoreAuthentication(instance),
        getRequestToken: async () => {
          const { signInUp } = get();
          try {
            const [account] = instance.getAllAccounts();
            if (!account) throw new Error('No account found');
            const result = await instance.acquireTokenSilent({
              scopes: [`https://${tenant}/${apiClientId}/${apiScope}`],
              authority: `${authority}/${tenant}/${policy}`,
              account
            });
            return result.accessToken;
          } catch (e) {
            if (e instanceof InteractionRequiredAuthError) {
              await signInUp();
            }
            throw e;
          }
        },
        onRedirect: async () => {
          const response = await instance.handleRedirectPromise();
          if (response && response.account) {
            set({
              status: AuthenticationStatus.Authenticated,
              account: getAccountDetails(response.account)
            });
            return response.state;
          } else {
            set({ status: AuthenticationStatus.NotAuthenticated });
          }
        },
        signInSilent: async () => {
          set({ status: AuthenticationStatus.Authenticating });
          const { account } = await instance.ssoSilent({
            scopes: ['openid', 'offline_access']
          });
          if (!account) throw new Error('No account found');
          set({
            status: AuthenticationStatus.Authenticated,
            account: getAccountDetails(account)
          });
        },
        signInUp: async (from?: string) => {
          window.sessionStorage.removeItem('msal.interaction.status');
          set({ status: AuthenticationStatus.Authenticating });
          await instance.loginRedirect({
            scopes: ['openid', 'offline_access'],
            state: from
          });
        },
        signOut: async () => {
          window.sessionStorage.removeItem('msal.interaction.status');
          set({ status: AuthenticationStatus.NotAuthenticated, account: null });
          await instance.logoutRedirect();
        }
      })),
    [instance, authority, tenant, policy, apiScope, apiClientId]
  );

  return <AuthenticationContext.Provider value={store}>{children}</AuthenticationContext.Provider>;
};
