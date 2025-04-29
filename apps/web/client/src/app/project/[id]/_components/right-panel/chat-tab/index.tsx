import { useChatContext } from '@/app/project/[id]/_hooks/use-chat';
import { ChatInput } from './chat-input';
import { ChatMessages } from './chat-messages';
import { Error } from './error';

export const ChatTab = () => {
    const { messages, input, handleInputChange, handleSubmit } = useChatContext();
    return (
        <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
            {messages.map(message => (
                <div key={message.id} className="whitespace-pre-wrap">
                    {message.role === 'user' ? 'User: ' : 'AI: '}
                    {message.parts.map((part, i) => {
                        switch (part.type) {
                            case 'text':
                                return <div key={`${message.id}-${i}`}>{part.text}</div>;
                        }
                    })}
                </div>
            ))}

            <form onSubmit={handleSubmit}>
                <input
                    className="fixed dark:bg-zinc-900 bottom-0 w-full max-w-md p-2 mb-8 border border-zinc-300 dark:border-zinc-800 rounded shadow-xl"
                    value={input}
                    placeholder="Say something..."
                    onChange={handleInputChange}
                />
            </form>
        </div>
    );

    return (
        <div className="flex flex-col h-full justify-end gap-2">
            <div className='h-full flex-1 overflow-y-auto'>
                <ChatMessages />
                <Error />
            </div>
            <ChatInput />
        </div>
    );
}
