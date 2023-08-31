export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: 'postgres://postgres:psqlpass@localhost:5432/psqldb',
  },
};
