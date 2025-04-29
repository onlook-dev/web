import type { ProjectManager } from "@/components/store/projects";
import type { UserManager } from "@/components/store/user";
import { sendAnalytics } from "@/utils/analytics";
import {
    ChatMessageRole,
    StreamRequestType,
    type AssistantChatMessage,
    type CompletedStreamResponse,
    type ErrorStreamResponse,
    type RateLimitedStreamResponse,
} from "@onlook/models/chat";
import type { ParsedError } from "@onlook/utility";
import type { CoreMessage } from "ai";
import { makeAutoObservable } from "mobx";
import type { EditorEngine } from "..";
import { ChatCodeManager } from "./code";
import { ChatContext } from "./context";
import { ConversationManager } from "./conversation";
import { isPromptTooLongError } from "./helpers";
import { SuggestionManager } from "./suggestions";

export const FOCUS_CHAT_INPUT_EVENT = "focus-chat-input";

export class ChatManager {
    isWaiting = false;
    conversation: ConversationManager;
    code: ChatCodeManager;
    context: ChatContext;
    suggestions: SuggestionManager;

    constructor(
        private editorEngine: EditorEngine,
        private projectsManager: ProjectManager,
        private userManager: UserManager,
    ) {
        makeAutoObservable(this);
        this.context = new ChatContext(
            this.editorEngine,
            this.projectsManager,
        );
        this.conversation = new ConversationManager(
            this.editorEngine,
            this.projectsManager,
        );
        this.code = new ChatCodeManager(this, this.editorEngine);
        this.suggestions = new SuggestionManager(this.projectsManager);
    }

    focusChatInput() {
        window.dispatchEvent(new Event(FOCUS_CHAT_INPUT_EVENT));
    }

    async getStreamMessages(content: string): Promise<CoreMessage[] | null> {
        if (!this.conversation.current) {
            console.error("No conversation found");
            return null;
        }

        const context = await this.context.getChatContext();
        const userMessage = this.conversation.addUserMessage(content, context);
        this.conversation.current.updateName(content);
        if (!userMessage) {
            console.error("Failed to add user message");
            return null;
        }
        sendAnalytics("send chat message", {
            content,
        });
        return this.generateStreamMessages(StreamRequestType.CHAT, content);
    }

    async getFixErrorMessages(errors: ParsedError[]): Promise<CoreMessage[] | null> {
        if (!this.conversation.current) {
            console.error("No conversation found");
            return null;
        }

        if (errors.length === 0) {
            console.error("No errors found");
            return null;
        }

        const prompt = `How can I resolve these errors? If you propose a fix, please make it concise.`;
        const errorContexts = this.context.getMessageContext(errors);
        const projectContexts = this.context.getProjectContext();
        const userMessage = this.conversation.addUserMessage(prompt, [
            ...errorContexts,
            ...projectContexts,
        ]);
        this.conversation.current.updateName(errors[0]?.content ?? "Fix errors");
        if (!userMessage) {
            console.error("Failed to add user message");
            return null;
        }
        sendAnalytics("send fix error chat message", {
            errors: errors.map((e) => e.content),
        });
        return this.generateStreamMessages(StreamRequestType.ERROR_FIX, prompt);
    }

    getResubmitMessages(id: string, newMessageContent: string) {
        if (!this.conversation.current) {
            console.error("No conversation found");
            return;
        }
        const message = this.conversation.current.messages.find((m) => m.id === id);
        if (!message) {
            console.error("No message found with id", id);
            return;
        }
        if (message.role !== ChatMessageRole.USER) {
            console.error("Can only edit user messages");
            return;
        }

        message.updateStringContent(newMessageContent);
        this.conversation.current.removeAllMessagesAfter(message);
        return this.generateStreamMessages(StreamRequestType.CHAT);
    }

    private async generateStreamMessages(
        requestType: StreamRequestType,
        userPrompt?: string,
    ): Promise<CoreMessage[] | null> {
        if (!this.conversation.current) {
            console.error("No conversation found");
            return null;
        }
        // Save current changes before sending to AI
        this.projectsManager.versions?.createCommit(
            userPrompt ?? "Save before chat",
            false,
        );

        this.isWaiting = true;
        const messages = this.conversation.current.getMessagesForStream();
        return messages;
    }

    async handleChatResponse(
        res: CompletedStreamResponse,
        requestType: StreamRequestType,
    ) {
        if (!res) {
            console.error("No response found");
            return;
        }

        if (res.type === "rate-limited") {
            this.handleRateLimited(res);
            return;
        } else if (res.type === "error") {
            this.handleError(res);
            return;
        }

        if (!this.conversation.current) {
            console.error("No conversation found");
            return;
        }

        if (res.usage) {
            this.conversation.current.updateTokenUsage(res.usage);
        }

        this.handleNewCoreMessages(res.payload);

        if (
            requestType === StreamRequestType.CHAT &&
            this.conversation.current?.messages &&
            this.conversation.current.messages.length > 0
        ) {
            this.suggestions.shouldHide = true;
            this.suggestions.generateNextSuggestions(
                this.conversation.current.getMessagesForStream(),
            );
        }

        this.context.clearAttachments();
    }

    handleNewCoreMessages(messages: CoreMessage[]) {
        for (const message of messages) {
            if (message.role === ChatMessageRole.ASSISTANT) {
                const assistantMessage =
                    this.conversation.addCoreAssistantMessage(message);
                if (!assistantMessage) {
                    console.error("Failed to add assistant message");
                } else {
                    this.autoApplyCode(assistantMessage);
                }
            } else if (message.role === ChatMessageRole.USER) {
                const userMessage = this.conversation.addCoreUserMessage(message);
                if (!userMessage) {
                    console.error("Failed to add user message");
                }
            } else if (message.role === ChatMessageRole.TOOL) {
                const toolMessage = this.conversation.addCoreToolMessage(message);
                if (!toolMessage) {
                    console.error("Failed to add tool message");
                }
            }
        }
    }

    autoApplyCode(assistantMessage: AssistantChatMessage) {
        if (this.userManager.settings.settings?.chat?.autoApplyCode) {
            setTimeout(() => {
                this.code.applyCode(assistantMessage.id);
            }, 100);
        }
    }

    handleRateLimited(res: RateLimitedStreamResponse) {
        // this.stream.errorMessage = res.rateLimitResult?.reason;
        // this.stream.rateLimited = res.rateLimitResult ?? null;
        sendAnalytics("rate limited", {
            rateLimitResult: res.rateLimitResult,
        });
    }

    handleError(res: ErrorStreamResponse) {
        console.error("Error found in chat response", res.message);
        if (isPromptTooLongError(res.message)) {
            // this.stream.errorMessage = PROMPT_TOO_LONG_ERROR;
        } else {
            // this.stream.errorMessage = res.message;
        }
        sendAnalytics("chat error", {
            content: res.message,
        });
    }

    clear() {
        this.code.clear();
        this.context.clear();
        if (this.conversation) {
            this.conversation.current = null;
        }
    }
}
