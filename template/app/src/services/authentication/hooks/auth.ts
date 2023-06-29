import { useLocation } from 'react-router';
import { useAuthentication } from '../AuthenticationProvider';

export const useRequestToken = () => {
  return useAuthentication(state => state.getRequestToken);
};

const InProgressCache = new Map<string, Promise<any>>();

const withCache = async (key: string, func: () => Promise<any>): Promise<any> => {
  if (InProgressCache.has(key)) {
    const promise = InProgressCache.get(key);
    if (!promise) throw new Error('Promise is undefined');
    return promise;
  }
  const action = func();
  InProgressCache.set(key, action);
  action.finally(() => {
    InProgressCache.delete(key);
  });
  return await action;
};

export const useSignInUp = () => {
  const [signIn, signInSilent] = useAuthentication(state => [state.signInUp, state.signInSilent]);
  const location = useLocation();

  return async (from?: string) => {
    try {
      if (location.pathname === '/auth/signin') throw new Error();
      return await withCache('signInSilent', signInSilent);
    } catch (e) {
      return await withCache(`signin-${from}`, async () => signIn(from));
    }
  };
};

export const useSignOut = () => {
  const signOut = useAuthentication(state => state.signOut);
  return async () => await withCache('signout', signOut);
};
