import type { ChatMessage } from '../message/index.ts';

export type ChatConversation = {
    id: string;
    displayName: string | null;
    messages: ChatMessage[];
    createdAt: string;
    updatedAt: string;
};
