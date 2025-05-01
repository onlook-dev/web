import { chatToolSet, initModel } from '@onlook/ai';
import { CLAUDE_MODELS, LLMProvider } from '@onlook/models';
import { generateObject, NoSuchToolError, streamText } from 'ai';

// TODO: Add tools
export async function POST(req: Request) {
    const { messages } = await req.json();

    const model = await initModel(LLMProvider.ANTHROPIC, CLAUDE_MODELS.SONNET);

    const result = streamText({
        model,
        messages,
        maxSteps: 10,
        tools: chatToolSet,
        maxTokens: 64000,
        experimental_repairToolCall: async ({
            toolCall,
            tools,
            parameterSchema,
            error,
        }) => {
            if (NoSuchToolError.isInstance(error)) {
                console.error('Invalid tool name', toolCall.toolName);
                return null; // do not attempt to fix invalid tool names
            }
            const tool = tools[toolCall.toolName as keyof typeof tools];

            console.warn(
                `Invalid parameter for tool ${toolCall.toolName} with args ${JSON.stringify(toolCall.args)}, attempting to fix`,
            );

            const { object: repairedArgs } = await generateObject({
                model,
                schema: tool?.parameters,
                prompt: [
                    `The model tried to call the tool "${toolCall.toolName}"` +
                    ` with the following arguments:`,
                    JSON.stringify(toolCall.args),
                    `The tool accepts the following schema:`,
                    JSON.stringify(parameterSchema(toolCall)),
                    'Please fix the arguments.',
                ].join('\n'),
            });

            return { ...toolCall, args: JSON.stringify(repairedArgs) };
        },
    });
    return result.toDataStreamResponse();
}