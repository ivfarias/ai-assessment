import { MemoryVariables } from 'langchain/memory';

export function formatChatHistory(chatHistory: MemoryVariables): string {
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

export function formatContexts(contexts: any[]): string {
  return contexts.map((c) => c.text).join('\n\n');
}

export function formatPromptContent(
  query: string,
  conversationType: string,
  chatHistory: MemoryVariables,
  contexts: any[],
) {
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
