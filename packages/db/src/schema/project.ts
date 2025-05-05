import { relations } from 'drizzle-orm';
import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { frames } from './frame';

export const projects = pgTable("projects", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }),
    previewUrl: varchar("preview_url", { length: 2048 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    previewImg: varchar("preview_img", { length: 2048 }),
    sandboxId: varchar("sandbox_id", { length: 64 }),
    sandboxUrl: varchar("sandbox_url", { length: 2048 }),
}).enableRLS();

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export const projectInsertSchema = createInsertSchema(projects);

export const projectsRelations = relations(projects, ({ many }) => ({
    frames: many(frames),
}));
