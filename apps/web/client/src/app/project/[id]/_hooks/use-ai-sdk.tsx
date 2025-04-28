'use client';

import { useEditorEngine } from "@/components/store";
import { useChat } from '@ai-sdk/react';

export function useAiSdk() {
    const editorEngine = useEditorEngine();
    const { messages, input, handleInputChange, handleSubmit } = useChat();


} 