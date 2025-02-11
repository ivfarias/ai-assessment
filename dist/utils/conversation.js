export function detectConversationType(query) {
    const greetings = /^(olá|oi|hello|hi|hey|hola)$/i;
    const questionIndicators = /\?|como|what|how|why|quando|where|qual|pode|can|could/i;
    if (greetings.test(query.trim()))
        return 'greeting';
    if (questionIndicators.test(query))
        return 'question';
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
//# sourceMappingURL=conversation.js.map