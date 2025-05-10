import type { Message } from '@ai-sdk/react';
import type { CodeDiff } from '../../code/index.ts';
import { type ChatMessageContext } from './context.ts';

export enum ChatMessageRole {
    USER = 'user',
    ASSISTANT = 'assistant',
    SYSTEM = 'system',
}

export interface UserChatMessage extends Message {
    role: ChatMessageRole.USER;
    context: ChatMessageContext[];
}

export interface AssistantChatMessage extends Message {
    role: ChatMessageRole.ASSISTANT;
    applied: boolean;
    snapshots: Record<string, CodeDiff> | null;
}

export interface SystemChatMessage extends Message {
    role: ChatMessageRole.SYSTEM;
}

export type ChatMessage =
    | UserChatMessage
    | AssistantChatMessage
    | SystemChatMessage;
