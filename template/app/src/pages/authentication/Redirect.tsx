import { FC, useEffect } from 'react';
import { Loading } from '@softwareimaging/react';
import { useNavigate } from 'react-router';
import { useAuthentication } from '@/services/authentication/AuthenticationProvider';
import { Meta } from '@/lib/meta';

export const Redirect: FC = () => {
  const onRedirect = useAuthentication(state => state.onRedirect);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const path = await onRedirect();
      if (path && path !== '/auth/redirect' && path !== '/auth/signout' && path !== '/auth/signin') {
        navigate(path);
        return;
      }

      navigate('/');
    })();
  }, [navigate, onRedirect]);

  return (
    <>
      <Meta title="Redirecting" />
      <Loading className="h-screen" />
    </>
  );
};
