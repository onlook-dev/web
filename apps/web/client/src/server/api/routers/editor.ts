import { editorServerConfig, type EditorRouter } from '@onlook/rpc';
import { createTRPCClient, createWSClient, httpBatchLink, splitLink, wsLink } from '@trpc/client';
import superJSON from 'superjson';
import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';

const { port, prefix } = editorServerConfig;
const urlEnd = `localhost:${port}${prefix}`;
const wsClient = createWSClient({ url: `ws://${urlEnd}` });

const editorClient = createTRPCClient<EditorRouter>({
    links: [
        splitLink({
            condition(op) {
                return op.type === 'subscription';
            },
            true: wsLink({ client: wsClient, transformer: superJSON }),
            false: httpBatchLink({
                url: `http://${urlEnd}`,
                transformer: superJSON,
            }),
        }),
    ],
});

/**
 * Helper functions to create forwarded procedures
 */
const createForwardedQuery = (path: string) => {
    const [namespace, procedure] = path.split('.');
    if (!namespace || !procedure) {
        throw new Error(`Invalid path: ${path}. Format should be 'namespace.procedure'`);
    }

    return publicProcedure
        .input(z.any())
        .query(({ input }) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (editorClient as any)[namespace][procedure].query(input);
        });
};

const createForwardedMutation = (path: string) => {
    const [namespace, procedure] = path.split('.');
    if (!namespace || !procedure) {
        throw new Error(`Invalid path: ${path}. Format should be 'namespace.procedure'`);
    }

    return publicProcedure
        .input(z.any())
        .mutation(({ input }) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (editorClient as any)[namespace][procedure].mutate(input);
        });
};

// Export the router with all the forwarded procedures
export const editorForwardRouter = createTRPCRouter({
    sandbox: createTRPCRouter({
        // Query procedures
        start: createForwardedQuery('sandbox.start'),
        getStatus: createForwardedQuery('sandbox.getStatus'),

        // Mutation procedures
        stop: createForwardedMutation('sandbox.stop'),

        // For subscriptions, you would need to implement a more complex solution
        // The pattern would be similar but requires proper handling of the subscription lifecycle
    }),
});
