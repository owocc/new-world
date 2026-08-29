// Applies Drizzle migrations to the configured database.
// Usage: npm run db:migrate
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';

config();

const { createClient } = await import('@libsql/client');

const url = process.env.LIBSQL_URL ?? 'file:./local.db';
const authToken = process.env.LIBSQL_AUTH_TOKEN;

console.log(`Migrating database at ${url} ...`);

const client = createClient({ url, authToken });
const db = drizzle(client);

await migrate(db, { migrationsFolder: './drizzle' });

console.log('Done.');
client.close();
