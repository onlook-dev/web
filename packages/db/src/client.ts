import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';

import * as schema from './schema';

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function createDrizzleClient(connectionString?: string) {
  if (!connectionString && typeof process !== 'undefined' && process.env) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseKey) {
      connectionString = `${supabaseUrl.replace('https://', 'postgres://postgres:')}${supabaseKey}@db.${supabaseUrl.replace('https://', '')}:5432/postgres`;
    }
  }
  
  if (!connectionString) {
    throw new Error('Database connection string is required');
  }
  
  if (!db) {
    const pool = new Pool({ connectionString });
    db = drizzle(pool, { schema });
  }
  
  return db;
}

export function getDrizzleClient() {
  if (!db) {
    return createDrizzleClient();
  }
  return db;
}
