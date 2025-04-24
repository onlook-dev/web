import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

export default defineConfig({
  schema: './src/schema/*.ts',
  out: './src/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.NEXT_PUBLIC_SUPABASE_URL 
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace('https://', 'postgres://postgres:postgres@')}:5432/postgres`
      : 'postgres://postgres:postgres@localhost:5432/postgres',
  },
});
