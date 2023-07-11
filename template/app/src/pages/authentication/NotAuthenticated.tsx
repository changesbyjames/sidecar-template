import { Loading } from '@softwareimaging/react';
import { FC, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';

export const NotAuthenticated: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    navigate('/auth/signin', { state: { from: location.pathname } });
  }, [navigate, location]);

  return <Loading className="h-screen" />;
};
