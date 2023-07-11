import { FC, useEffect } from 'react';
import { Loading } from '@softwareimaging/react';
import { useSignInUp } from '@/services/authentication/hooks/auth';
import { Meta } from '@/lib/meta';
import { useLocation } from 'react-router-dom';

export const SignIn: FC = () => {
  const signIn = useSignInUp();
  const location = useLocation();

  useEffect(() => {
    const from = location.state?.from;
    signIn(from);
  }, [signIn, location]);

  return (
    <>
      <Meta title="Sign in" />
      <Loading className="h-screen" />
    </>
  );
};
