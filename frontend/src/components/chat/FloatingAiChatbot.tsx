import React from 'react'
import { useLocation } from 'react-router-dom'
import { AiChatLauncher } from './AiChatLauncher'
import { AiChatPanel } from './AiChatPanel'
import { shouldShowFloatingChat } from './floatingChatUtils'
import './FloatingAiChatbot.css'

export const FloatingAiChatbot: React.FC = () => {
  const location = useLocation()

  if (!shouldShowFloatingChat(location.pathname)) {
    return null
  }

  return (
    <div className="floating-ai-chatbot-root">
      <AiChatPanel />
      <AiChatLauncher />
    </div>
  )
}
