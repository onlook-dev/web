import { useChatContext } from '@/app/project/[id]/_hooks/use-chat';
import { useEditorEngine } from '@/components/store';
import { Icons } from '@onlook/ui/icons/index';
import { observer } from 'mobx-react-lite';
import { MessageContent } from './message-content';

export const StreamMessage = observer(() => {
    const editorEngine = useEditorEngine();
    const { messages, status } = useChatContext();
    const streamMessage = messages.findLast(m => m.role === 'assistant');

    if (!streamMessage || status !== 'streaming') {
        return null;
    }

    return (
        <>
            {editorEngine.chat.isWaiting && (
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
                            content={streamMessage.parts}
                            applied={false}
                            isStream={true}
                        />
                    </div>
                </div>
            )}
        </>
    );
});
