import { users } from "@onlook/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const userRouter = createTRPCRouter({
    getById: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
        const user = await ctx.db.query.users.findFirst({
            where: eq(users.id, input),
        })
        return user
    }),
    create: publicProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
        const user = await ctx.db.insert(users).values({
            id: input,
        }).returning({ id: users.id });
        if (!user[0]) {
            throw new Error("Failed to create user");
        }
        return user[0]
    }),
});  
