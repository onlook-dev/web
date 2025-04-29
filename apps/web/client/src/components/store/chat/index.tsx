import { useChat, type UseChatHelpers } from '@ai-sdk/react';
import { createContext, useContext } from 'react';

const ChatContext = createContext<UseChatHelpers | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
    const chat = useChat({ id: 'global-chat', api: '/api/chat' });
    return <ChatContext.Provider value={chat}>{children}</ChatContext.Provider>;
}

export function useChatContext() {
    const context = useContext(ChatContext);
    if (!context) throw new Error('useChatContext must be used within a ChatProvider');
    return context;
}
