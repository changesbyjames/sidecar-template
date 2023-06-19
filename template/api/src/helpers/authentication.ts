export const isDomainOnAllowlist = (email: string) => {
  const domains = process.env.ALLOWED_DOMAINS?.split(',');
  if (!domains) return false;
  return domains.some(domain => email.endsWith(`@${domain}`));
};

export const isDomainOnAdminList = (email: string) => {
  const domains = process.env.ADMIN_DOMAINS?.split(',');
  if (!domains) return false;
  return domains.some(domain => email.endsWith(`@${domain}`));
};
