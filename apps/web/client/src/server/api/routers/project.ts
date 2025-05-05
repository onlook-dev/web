import { projectInsertSchema, projects } from "@onlook/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const projectRouter = createTRPCRouter({
    getById: publicProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const project = await ctx.db.query.projects.findFirst({
                where: eq(projects.id, input.id),
            });
            return project;
        }),
    create: publicProcedure
        .input(projectInsertSchema)
        .mutation(async ({ ctx, input }) => {
            const project = await ctx.db.insert(projects).values(input).returning();
            return project[0];
        }),
});