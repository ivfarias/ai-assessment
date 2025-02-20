export function formatChatHistory(chatHistory) {
    if (!chatHistory.chat_history || !chatHistory.chat_history.length) {
        return 'No previous conversation';
    }
    const lastFiveMessages = chatHistory.chat_history.slice(-5);
    const formattedHistory = lastFiveMessages.map((message) => {
        const role = 'tool_calls' in message ? 'Assistant' : 'User';
        return `${role}: ${message.content}`;
    });
    return formattedHistory.join('\n');
}
export function formatContexts(contexts) {
    return contexts.map((c) => c.text).join('\n\n');
}
export function formatPromptContent(query, conversationType, chatHistory, contexts) {
    const formattedHistory = formatChatHistory(chatHistory);
    if (conversationType === 'greeting') {
        return [
            `Query: "${query}"`,
            `Conversation Type: ${conversationType}`,
            '',
            'Chat History:',
            formattedHistory,
            '',
            'Instructions: This is just a greeting. Respond naturally without assuming any support context.',
        ].join('\n');
    }
    return [
        `Query: "${query}"`,
        `Conversation Type: ${conversationType}`,
        '',
        'Chat History:',
        formattedHistory,
        '',
        'Contexts:',
        formatContexts(contexts),
    ].join('\n');
}
//# sourceMappingURL=conversation.js.map