import { useContext } from 'react'
import { AiChatContext, type AiChatContextValue } from './aiChatContextDef'

export function useAiChat(): AiChatContextValue {
  const context = useContext(AiChatContext)
  if (!context) {
    return {
      isOpen: false,
      isMinimized: false,
      openChat: () => {},
      closeChat: () => {},
      toggleChat: () => {},
      toggleMinimize: () => {},
      activeConversation: null,
      messages: [],
      isStreaming: false,
      error: null,
      learningContext: null,
      setLearningContext: () => {},
      providerStatus: null,
      sendMessage: async () => {},
      cancelProcessing: () => {},
      startNewConversation: async () => {},
      clearError: () => {},
      clearInjectedPrompt: () => {},
    }
  }
  return context
}

export { AiChatContext, type AiChatContextValue }
