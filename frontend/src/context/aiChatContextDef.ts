import { createContext } from 'react'
import type { AiProviderStatus } from '@/services/aiTutor.service'
import type {
  ChatConversation,
  ChatMessage,
  TutorLearningContext,
  LearningAssistanceMode,
} from '@/types/aiTutor'

export interface AiChatContextValue {
  isOpen: boolean
  isMinimized: boolean
  openChat: (customContext?: TutorLearningContext, suggestedPrompt?: string) => void
  closeChat: () => void
  toggleChat: () => void
  toggleMinimize: () => void
  activeConversation: ChatConversation | null
  messages: ChatMessage[]
  isStreaming: boolean
  error: string | null
  learningContext: TutorLearningContext | null
  setLearningContext: (context: TutorLearningContext | null) => void
  providerStatus: AiProviderStatus | null
  sendMessage: (text: string, mode?: LearningAssistanceMode) => Promise<void>
  cancelProcessing: () => void
  startNewConversation: () => Promise<void>
  clearError: () => void
  injectedPrompt?: string
  clearInjectedPrompt: () => void
}

export const AiChatContext = createContext<AiChatContextValue | null>(null)
