import { FC, useEffect } from 'react';
import { Loading } from '@softwareimaging/react';
import { useSignOut } from '@/services/authentication/hooks/auth';
import { useNavigate } from 'react-router';
import { Meta } from '@/lib/meta';

export const SignOut: FC = () => {
  const signOut = useSignOut();
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      await signOut();
      navigate('/');
    })();
  }, [signOut, navigate]);

  return (
    <>
      <Meta title="Sign out" />
      <Loading className="h-screen" />
    </>
  );
};
