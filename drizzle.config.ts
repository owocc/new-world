import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.LIBSQL_URL ?? 'file:./local.db',
    authToken: process.env.LIBSQL_AUTH_TOKEN,
  },
});
