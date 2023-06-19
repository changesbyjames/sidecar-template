import { z } from 'zod';

export const AuthenticationConfig = z.object({
  clientId: z.string(),
  clientSecret: z.string(),
  tenantId: z.string()
});

export type AuthenticationConfig = z.infer<typeof AuthenticationConfig>;

export const resolveAuthentication = (config?: Partial<AuthenticationConfig>): AuthenticationConfig => {
  try {
    return AuthenticationConfig.parse(config);
  } catch {
    const environment: Partial<AuthenticationConfig> = {
      clientId: process.env.GRAPH_APP_CLIENT_ID,
      clientSecret: process.env.GRAPH_APP_CLIENT_SECRET,
      tenantId: process.env.GRAPH_APP_TENANT
    };
    return AuthenticationConfig.parse(environment);
  }
};

export interface DriveConfiguration {
  read: boolean;
  write: boolean;
  drives: string[];
}

export interface ItemAccessConfiguration {
  read: string[];
  write: string[];
}

export const resolveDrives = (configuration: Partial<DriveConfiguration> = {}): DriveConfiguration => {
  const drives = configuration.drives ?? [];
  const environment = process.env.APPROVED_DRIVE;
  if (environment) drives.push(environment);
  if (drives.length === 0) throw new Error('No drives configured');
  return {
    read: configuration.read ?? process.env.CAN_ACCESS_ROOT === 'true',
    write: configuration.write ?? process.env.CAN_WRITE_ROOT === 'true',
    drives
  };
};
