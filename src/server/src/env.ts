import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({});
  dotenv.config({ path: '../../.env' });
}

function envVar(name: string): string | undefined {
  return process.env[name];
}

function envVarProdForce(name: string): string | undefined {
  const value = envVar(name);
  if (value === undefined && process.env.NODE_ENV === 'production') {
    throw new Error(`${name} environment variable must be defined in production`);
  }
  return value;
}

export const env = {
  port: envVarProdForce('PORT') ?? '8080',
  publicDir: envVarProdForce('PUBLIC_DIR'),
  databaseUrl: envVarProdForce('DATABASE_URL') ?? "postgres://postgres:psqlpass@localhost:5432/psqldb",
};
