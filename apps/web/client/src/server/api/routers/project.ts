import { projectInsertSchema, projects, toCanvas, toFrame, toProject, userProjects } from '@onlook/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const projectRouter = createTRPCRouter({
    listAll: protectedProcedure.query(async ({ ctx }) => {
        const projects = await ctx.db.query.projects.findMany();
        return projects.map(toProject);
    }),
    getFullProjectById: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const project = await ctx.db.query.projects.findFirst({
                where: eq(projects.id, input.id),
                with: {
                    canvas: {
                        with: {
                            frames: true,
                        },
                    },
                },
            });
            if (!project) {
                return null;
            }
            return {
                project: toProject(project),
                canvas: toCanvas(project.canvas),
                frames: project.canvas.frames.map(toFrame),
            }
        }),
    getPreviewProjectsByUserId: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const projects = await ctx.db.query.userProjects.findMany({
                where: eq(userProjects.userId, input.id),
                with: {
                    project: true,
                },
            });
            return projects.map((project) => toProject(project.project));
        }),
    create: protectedProcedure.input(projectInsertSchema).mutation(async ({ ctx, input }) => {
        const project = await ctx.db.insert(projects).values(input).returning();
        return project[0];
    }),
    createUserProject: protectedProcedure
        .input(z.object({ project: projectInsertSchema, userId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            return await ctx.db.transaction(async (tx) => {
                // 1. Insert the new project
                const [newProject] = await tx.insert(projects).values(input.project).returning();

                if (!newProject) {
                    throw new Error('Failed to create project');
                }

                // 2. Create the association in the junction table
                await tx.insert(userProjects).values({
                    userId: input.userId,
                    projectId: newProject.id,
                });

                return newProject;
            });
        }),
});
