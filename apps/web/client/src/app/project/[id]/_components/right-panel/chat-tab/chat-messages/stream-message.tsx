import { useChatContext } from '@/app/project/[id]/_hooks/use-chat';
import { ChatMessageRole } from '@onlook/models/chat';
import { Icons } from '@onlook/ui/icons/index';
import { MessageContent } from './message-content';

export const StreamMessage = () => {
    const { messages, status } = useChatContext();
    const streamMessage = messages.length > 0 ? messages[messages.length - 1] : null;

    if (!streamMessage || streamMessage.role !== ChatMessageRole.ASSISTANT || (status !== 'streaming' && status !== 'submitted')) {
        return null;
    }

    return (
        <>
            {status === 'streaming' || status === 'submitted' && (
                <div className="flex w-full h-full flex-row items-center gap-2 px-4 my-2 text-small content-start text-foreground-secondary">
                    <Icons.Shadow className="animate-spin" />
                    <p>Thinking ...</p>
                </div>
            )}
            {streamMessage.parts && (
                <div className="px-4 py-2 text-small content-start">
                    <div className="flex flex-col text-wrap gap-2">
                        <MessageContent
                            messageId={streamMessage.id}
                            parts={streamMessage.parts}
                            applied={false}
                            isStream={true}
                        />
                    </div>
                </div>
            )}
        </>
    );
};
