import { useMemo, useState } from 'react';
import { useAuthentication, RoleType } from '../AuthenticationProvider';

type ExtensionKey<T extends string> = `extension_${T}`;
type Extension<T extends string> = Record<ExtensionKey<T>, string>;

interface User {
  firstName: string;
  lastName: string;
  email: string;

  organisationId?: string;
  roles: Role[];
}

interface Role {
  type: RoleType;
  organisationId?: string;
}

const parseRoles = (claim: string): Role[] => {
  return claim.split(',').map(role => {
    const [type, id] = role.split(':');
    if (type === RoleType.Admin) return { type: type as RoleType };
    if (!id) throw new Error('Missing id');
    if (type === RoleType.Customer) return { type: type as RoleType, organisationId: id };
    throw new Error('Invalid role');
  });
};

export const useUser = (): [User, (customerId: string) => void] => {
  const account = useAuthentication(state => state.account);
  if (!account) throw new Error('Missing accounts');
  const claims = useMemo(() => {
    const { firstName, lastName, email } = account;
    const claims = account.claims as Extension<'ApprovedReadItems' | 'ApprovedWriteItems' | 'Role'>;
    const rolesClaim = claims.extension_Role;
    if (!rolesClaim) throw new Error('Missing roles');
    const roles = parseRoles(rolesClaim);

    return {
      firstName,
      lastName,
      email,
      roles
    };
  }, [account]);

  const [organisationId, setOrganisationId] = useState<string | undefined>(claims.roles[0]?.organisationId);
  return [{ ...claims, organisationId }, setOrganisationId];
};

export const useOrganisationId = (): string => {
  const [user] = useUser();
  if (!user.organisationId) throw new Error('Missing organisation ID');
  return user.organisationId;
};
