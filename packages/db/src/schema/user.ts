import { pgTable, uuid } from 'drizzle-orm/pg-core';
import { authUsers } from './supabase/user';

export const users = pgTable("users", {
    id: uuid("id")
        .primaryKey()
        .references(() => authUsers.id, { onDelete: "cascade", onUpdate: "cascade" }),
    // TODO: Add other user fields here
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
