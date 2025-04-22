import { ChatInput } from './chat-input';
import { ChatMessages } from './chat-messages';
import { Error } from './error';

export const ChatTab = () => {
    return (
        <div className="flex flex-col w-full h-full justify-end gap-2">
            <ChatMessages />
            <Error />
            <div className="flex-grow-0">
                <ChatInput />
            </div>
        </div>
    );
};
