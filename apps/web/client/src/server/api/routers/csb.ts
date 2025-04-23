import { create, hibernate, list, start } from "@/utils/codesandbox/server";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const csbRouter = createTRPCRouter({
    create: publicProcedure
        .input(z.string())
        .mutation(async ({ input }) => {
            return await create(input);
        }),
    start: publicProcedure
        .input(z.string())
        .mutation(async ({ input }) => {
            return await start(input);
        }),
    hibernate: publicProcedure
        .input(z.string())
        .mutation(async ({ input }) => {
            return await hibernate(input);
        }),
    list: publicProcedure
        .query(async () => {
            return await list();
        }),
    readFile: publicProcedure
        .input(z.object({
            sandboxId: z.string(),
            filePath: z.string(),
        }))
        .query(async ({ input }) => {
            throw new Error("Not implemented: Use client-side SandboxManager for file operations");
        }),
    writeFile: publicProcedure
        .input(z.object({
            sandboxId: z.string(),
            filePath: z.string(),
            content: z.string(),
        }))
        .mutation(async ({ input }) => {
            throw new Error("Not implemented: Use client-side SandboxManager for file operations");
        }),
});  