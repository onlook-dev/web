import { ChatMessageRole, type ChatConversation, type ChatMessage, type ChatMessageContext, type CodeDiff } from "@onlook/models";
import type { Conversation as DbConversation, Message as DbMessage } from "../schema";

export const toConversation = (dbConversation: DbConversation, messages: DbMessage[]): ChatConversation => {
    return {
        id: dbConversation.id,
        displayName: dbConversation.displayName,
        createdAt: dbConversation.createdAt.toISOString(),
        updatedAt: dbConversation.updatedAt.toISOString(),
        messages: messages.map(toMessage),
    }
}

export const fromConversation = (projectId: string, conversation: ChatConversation): DbConversation => {
    return {
        id: conversation.id,
        displayName: conversation.displayName,
        createdAt: new Date(conversation.createdAt),
        updatedAt: new Date(conversation.updatedAt),
        projectId: projectId,
    }
}

export const toMessage = (dbMessage: DbMessage): ChatMessage => {
    if (dbMessage.role === ChatMessageRole.ASSISTANT) {
        return {
            id: dbMessage.id,
            content: dbMessage.content,
            role: dbMessage.role as ChatMessageRole.ASSISTANT,
            createdAt: dbMessage.createdAt,
            applied: dbMessage.applied ?? false,
            snapshots: null,
        }
    } else if (dbMessage.role === ChatMessageRole.USER) {
        return {
            id: dbMessage.id,
            content: dbMessage.content,
            role: dbMessage.role as ChatMessageRole.USER,
            createdAt: dbMessage.createdAt,
            context: [],
        }
    } else {
        return {
            id: dbMessage.id,
            content: dbMessage.content,
            role: dbMessage.role as ChatMessageRole.SYSTEM,
            createdAt: dbMessage.createdAt,
        }
    }
}

export const fromMessage = (conversationId: string, message: ChatMessage): DbMessage => {
    let snapshots: Record<string, CodeDiff> | null = null;
    let context: ChatMessageContext[] = [];

    if (message.role === ChatMessageRole.ASSISTANT) {
        snapshots = message.snapshots ?? null;
    }

    if (message.role === ChatMessageRole.USER) {
        context = message.context ?? [];
    }

    return {
        id: message.id,
        content: message.content,
        role: message.role as ChatMessageRole,
        createdAt: message.createdAt ?? new Date(),
        conversationId,
        applied: message.role === ChatMessageRole.ASSISTANT ? message.applied ?? false : false,
        snapshots,
        context,
    }
}
