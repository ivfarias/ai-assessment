export function detectConversationType(query, chatHistory) {
    const cleanQuery = query.toLowerCase().trim();
    const onlyGreeting = /^(olá|ola|oi|hello|hi|hey|hola|bom dia|boa tarde|boa noite)$/i;
    const questionIndicators = /\?|como|what|how|why|quando|where|qual|pode|can|could|preciso|quero|gostaria/i;
    if (onlyGreeting.test(cleanQuery) &&
        (!chatHistory.chat_history || !chatHistory.chat_history.length)) {
        return 'greeting';
    }
    if (questionIndicators.test(cleanQuery)) {
        return 'question';
    }
    return 'general';
}
export function weightContextRelevance(query, contexts) {
    const cleanQuery = query.toLowerCase().trim();
    return contexts
        .map((context) => {
        const cleanContext = context.text.toLowerCase();
        let relevanceMultiplier = 1;
        const isOnlyGreeting = /^(olá|oi|hello|hi|hey|hola)$/i.test(cleanContext);
        if (isOnlyGreeting) {
            relevanceMultiplier *= 0.5;
        }
        const queryWords = cleanQuery.split(/\s+/).filter((word) => {
            return word.length > 2 && !/^(olá|oi|hello|hi|hey|hola)$/i.test(word);
        });
        const matchingWords = queryWords.filter((word) => cleanContext.includes(word));
        if (matchingWords.length > 0) {
            relevanceMultiplier *= 1 + matchingWords.length / queryWords.length;
        }
        const isGenericShortResponse = cleanContext.length < 20 && /^(ok|sim|não|yes|no)$/i.test(cleanContext);
        if (isGenericShortResponse) {
            relevanceMultiplier *= 0.7;
        }
        return {
            ...context,
            score: context.score * relevanceMultiplier,
        };
    })
        .sort((a, b) => b.score - a.score);
}
export function formatChatHistory(chatHistory) {
    if (!chatHistory.chat_history || !chatHistory.chat_history.length) {
        return 'No previous conversation';
    }
    const lastFiveMessages = chatHistory.chat_history.slice(-5);
    return lastFiveMessages.map((msg) => `${msg.type}: ${msg.content}`).join('\n');
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