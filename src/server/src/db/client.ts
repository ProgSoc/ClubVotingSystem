import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { env } from "../env";
import * as schema from "./schema";
import path from "path";

const connectionUrl = env.databaseUrl;

export async function migrateDB () {
  const migrationsFolder = path.join(__dirname, './db/migrations');
  const migrationPgClient = postgres(connectionUrl, {
    max: 1,
  })
  
  const migrationClient = drizzle(migrationPgClient, {
    schema
  })
  
  await migrate(migrationClient, { migrationsFolder})
}

const pgClient = postgres(connectionUrl, {transform: {
  value(value) {
    if (value instanceof Date) {
      return value.toISOString();
    } else {
      return value;
    }
  },
}});

const db = drizzle(pgClient, { schema })

export default db;