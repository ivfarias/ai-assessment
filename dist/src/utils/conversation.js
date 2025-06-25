import { ToolMessage, AIMessage, HumanMessage } from '@langchain/core/messages';
export function formatChatHistory(chatHistory) {
    if (!chatHistory.chat_history || !chatHistory.chat_history.length) {
        return 'No previous conversation';
    }
    const lastFiveMessages = chatHistory.chat_history.slice(-5);
    const formattedHistory = lastFiveMessages.map((message) => {
        if (message instanceof HumanMessage) {
            return `User: ${message.content}`;
        }
        else if (message instanceof AIMessage) {
            let content = message.content;
            if (message.tool_calls && message.tool_calls.length > 0) {
                const toolCallStr = JSON.stringify(message.tool_calls);
                content = `${content} [Tool Calls: ${toolCallStr}]`;
            }
            return `Assistant: ${content}`;
        }
        else if (message instanceof ToolMessage) {
            return `Tool Result [${message.tool_call_id}]: ${message.content}`;
        }
        // Fallback for other message types
        return `${message.constructor.name.replace("Message", "")}: ${message.content}`;
    });
    return formattedHistory.join('\n');
}
export function formatContexts(contexts) {
    return contexts.map((c) => c.text).join('\n\n');
}
//# sourceMappingURL=conversation.js.map