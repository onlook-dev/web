import { CodeSandbox } from '@codesandbox/sdk';
const sdk = new CodeSandbox(process.env.CSB_API_KEY!);

// Create a new sandbox from a template
export const create = async (sandboxId: string) => {
    const sandbox = await sdk.sandbox.create({ template: sandboxId });
    return {
        sandboxId: sandbox.id,
        previewUrl: `https://${sandbox.id}-8084.csb.app`,
    };
};

// Start a sandbox
export const start = async (sandboxId: string) => {
    const startData = await sdk.sandbox.start(sandboxId);
    return startData;
};

// Stop a sandbox
export const hibernate = async (sandboxId: string): Promise<void> => {
    await sdk.sandbox.hibernate(sandboxId);
};

// List all sandboxes
export const list = async () => {
    const sdk = new CodeSandbox(process.env.CSB_API_KEY!);
    const listResponse = await sdk.sandbox.list();
    return listResponse;
};

// Reconnect to a sandbox
export const reconnect = async (sandboxId: string) => {
    const startData = await sdk.sandbox.start(sandboxId);
    return startData;
};
