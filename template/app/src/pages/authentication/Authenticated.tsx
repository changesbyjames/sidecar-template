import { useAuthentication } from '@/services/authentication/AuthenticationProvider';
import { FC } from 'react';
import { NotAuthenticated } from './NotAuthenticated';
import { Outlet } from 'react-router-dom';

export const Authenticated: FC = () => {
  const account = useAuthentication(state => state.account);
  return account ? <Outlet /> : <NotAuthenticated />;
};
