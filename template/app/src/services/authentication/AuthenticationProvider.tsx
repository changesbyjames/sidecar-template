import { createContext, useContext } from 'react';
import { StoreApi, useStore } from 'zustand';

export enum AuthenticationStatus {
  NotAuthenticated = 'NotAuthenticated',
  Authenticating = 'Authenticating',
  Authenticated = 'Authenticated',
  Error = 'Error'
}

export interface Account {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  claims: { [key: string]: string | number | string[] };
}

export enum RoleType {
  Admin = 'ADMIN',
  Customer = 'CUSTOMER'
}

export interface AuthenticationInformation {
  status: AuthenticationStatus;
  account?: Account | null;
}

export interface AuthenticationActions {
  onRedirect: () => Promise<string | void>;
  signInSilent: () => Promise<void>;
  signInUp: (from?: string) => Promise<void>;
  signOut: () => Promise<void>;
  getRequestToken: () => Promise<string>;
}

export interface AuthenticationStore extends AuthenticationInformation, AuthenticationActions {}
export const AuthenticationContext = createContext<StoreApi<AuthenticationStore> | null>(null);

type SelectorReturn<S extends (s: AuthenticationStore) => any> = ReturnType<S>;

export function useAuthentication<S extends (s: AuthenticationStore) => any>(selector: S): SelectorReturn<S> {
  const context = useContext(AuthenticationContext);
  if (!context) {
    throw new Error('useAuthentication must be used within a AuthenticationProvider');
  }
  return useStore(context, selector);
}
