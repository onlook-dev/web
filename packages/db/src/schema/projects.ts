import { pgTable, serial, text, timestamp, json } from 'drizzle-orm/pg-core';

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  userId: text('user_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  data: json('data')
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
