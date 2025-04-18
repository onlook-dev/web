import { editorServerConfig, type EditorRouter } from '@onlook/rpc';
import { createTRPCClient, createWSClient, httpBatchLink, splitLink, wsLink } from '@trpc/client';
import { observable } from '@trpc/server/observable';
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

// Helper functions to create procedures that forward to the client
function createForwardQueryProcedure<TInput extends z.ZodTypeAny>(
    clientQueryFn: (input: z.infer<TInput>) => Promise<any>,
    inputSchema: TInput
) {
    return publicProcedure
        .input(inputSchema)
        .query(({ input }) => {
            return clientQueryFn(input);
        });
}

function createForwardMutationProcedure<TInput extends z.ZodTypeAny>(
    clientMutationFn: (input: z.infer<TInput>) => Promise<any>,
    inputSchema: TInput
) {
    return publicProcedure
        .input(inputSchema)
        .mutation(({ input }) => {
            return clientMutationFn(input);
        });
}

function createForwardSubscriptionProcedure<TInput extends z.ZodTypeAny>(
    clientSubscriptionFn: (input: z.infer<TInput>) => Promise<any>,
    inputSchema: TInput
) {
    return publicProcedure
        .input(inputSchema)
        .subscription(({ input }) => {
            // Create an observable that forwards to the client subscription
            return observable((emit) => {
                const subscription = clientSubscriptionFn(input);

                // No need for explicit clean-up as the client library handles it
                return () => {
                    // Subscription cleanup if needed
                };
            });
        });
}

// Export the router with all the forwarded procedures
export const editorForwardRouter = createTRPCRouter({
    sandbox: createTRPCRouter({
        // Query procedures
        start: createForwardQueryProcedure(
            editorClient.sandbox.start.query,
            z.object({ projectId: z.string() })
        ),
        getStatus: createForwardQueryProcedure(
            editorClient.sandbox.getStatus.query,
            z.object({
                sandboxId: z.string(),
                includeDetails: z.boolean().optional()
            })
        ),

        // Mutation procedures
        stop: createForwardMutationProcedure(
            editorClient.sandbox.stop.mutate,
            z.object({
                sandboxId: z.string(),
                force: z.boolean().optional()
            })
        ),

        // For subscriptions, you would need to implement a more complex solution
        // The pattern would be similar but requires proper handling of the subscription lifecycle
    }),
});
