import dotenv from 'dotenv';

dotenv.config({});
dotenv.config({ path: '../../.env' });

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
  selfUrl: envVarProdForce('SELF_URL') ?? 'http://localhost:5173',
};
