import React from 'react'
import { BookOpen, HelpCircle, Lightbulb, Play, Sparkles, Target } from 'lucide-react'
import { useAiChat } from '@/context/AiChatContext'

export interface AiChatSuggestionsProps {
  onSelectPrompt: (prompt: string) => void
}

export const AiChatSuggestions: React.FC<AiChatSuggestionsProps> = ({ onSelectPrompt }) => {
  const { learningContext } = useAiChat()

  const getSuggestions = () => {
    const pageType = (learningContext as any)?.pageType || learningContext?.source
    const sectionType = learningContext?.sectionType

    // Section-specific suggestions in redesigned Lesson page
    if (sectionType === 'video' || learningContext?.source === 'lesson-video') {
      const vTitle = learningContext?.videoTitle || learningContext?.title || 'video này'
      return [
        {
          label: 'Giải thích nội dung video này',
          icon: Play,
          prompt: `Giải thích nội dung chính và các điểm cần lưu ý trong video "${vTitle}".`,
        },
        {
          label: 'Tóm tắt bài giảng video',
          icon: BookOpen,
          prompt: 'Tóm tắt các bước lý thuyết và bài tập được giảng viên trình bày trong video.',
        },
        {
          label: 'Lưu ý bẫy hay gặp',
          icon: Sparkles,
          prompt: 'Những điểm quan trọng nào trong video em cần lưu ý để không làm sai bài tập?',
        },
      ]
    }

    if (sectionType === 'overview' || learningContext?.source === 'lesson-overview') {
      return [
        {
          label: 'Tóm tắt kiến thức trọng tâm của bài',
          icon: BookOpen,
          prompt: 'Tóm tắt các kiến thức trọng tâm và mục tiêu cần đạt của bài học này.',
        },
        {
          label: 'Mục tiêu GDPT 2018',
          icon: Target,
          prompt: 'Giải thích chi tiết các năng lực và kỹ năng toán học cần rèn luyện ở bài này.',
        },
        {
          label: 'Lộ trình học hiệu quả',
          icon: Sparkles,
          prompt: 'Em nên học theo trình tự nào giữa lý thuyết, xem video và làm ví dụ để đạt kết quả tốt nhất?',
        },
      ]
    }

    if (sectionType === 'theory' || learningContext?.source === 'lesson-theory') {
      return [
        {
          label: 'Giải thích công thức này dễ hiểu hơn',
          icon: Lightbulb,
          prompt: 'Giải thích công thức này một cách dễ hiểu, kèm theo ví dụ minh họa trực quan và điều kiện áp dụng.',
        },
        {
          label: 'Bản chất định nghĩa & định lý',
          icon: BookOpen,
          prompt: 'Giải thích ý nghĩa thực tế và hình học của định nghĩa/định lý này.',
        },
        {
          label: 'Bẫy đề thi cần nhớ',
          icon: HelpCircle,
          prompt: 'Chỉ ra những lỗi sai hoặc bẫy đề thi mà học sinh hay mắc phải ở phần lý thuyết này.',
        },
      ]
    }

    if (sectionType === 'example' || learningContext?.source === 'lesson-example') {
      return [
        {
          label: 'Hướng dẫn em giải ví dụ này từng bước',
          icon: Lightbulb,
          prompt: 'Hướng dẫn em giải ví dụ này từng bước, giải thích tư duy phân tích tại mỗi bước biến đổi.',
        },
        {
          label: 'Cách nhận biết dạng bài',
          icon: BookOpen,
          prompt: 'Làm thế nào để nhận biết và phân loại bài toán dạng này khi gặp trong bài thi?',
        },
        {
          label: 'Cách kiểm tra lại đáp số',
          icon: Sparkles,
          prompt: 'Có cách nào để kiểm tra lại nhanh kết quả của bài toán này không?',
        },
      ]
    }

    if (
      sectionType === 'practice' ||
      learningContext?.source === 'lesson-practice' ||
      pageType === 'practice' ||
      pageType === 'assessment-question'
    ) {
      return [
        {
          label: 'Gợi ý cho em cách bắt đầu câu hỏi này',
          icon: Lightbulb,
          prompt: 'Gợi ý cho em cách bắt đầu câu hỏi này (vui lòng không tiết lộ trực tiếp đáp án đúng).',
        },
        {
          label: 'Công thức toán học chìa khóa',
          icon: BookOpen,
          prompt: 'Công thức hoặc định lý nào là mấu chốt để tìm ra lời giải cho bài này?',
        },
        {
          label: 'Em có thể sai ở bước nào?',
          icon: HelpCircle,
          prompt: 'Khi giải câu hỏi này, bước nào là bước dễ nhầm lẫn nhất?',
        },
      ]
    }

    if (pageType === 'curriculum') {
      return [
        { label: 'Giải thích giáo trình này', icon: BookOpen, prompt: 'Hãy giới thiệu cấu trúc các chương và trọng tâm kiến thức của giáo trình Toán 12 này.' },
        { label: 'Công thức cần nhớ', icon: Lightbulb, prompt: 'Tóm tắt các công thức quan trọng nhất cần nắm vững trong chương trình Toán 12.' },
        { label: 'Gợi ý cách học hiệu quả', icon: Sparkles, prompt: 'Làm thế nào để học tốt và đạt điểm cao môn Toán 12?' },
      ]
    }

    if (pageType === 'review_wrong') {
      return [
        { label: 'Em sai ở bước nào?', icon: HelpCircle, prompt: 'Hãy chỉ ra nguyên nhân sai lầm thường gặp nhất ở câu hỏi này.' },
        { label: 'Giải thích bản chất', icon: BookOpen, prompt: 'Giải thích bản chất định nghĩa hoặc định lý liên quan đến bài này.' },
        { label: 'Cho bài tập tương tự', icon: Sparkles, prompt: 'Cho em 1 bài tập tương tự để em tự luyện tập lại.' },
      ]
    }

    // Default / General context
    return [
      { label: 'Giải thích bài học này', icon: BookOpen, prompt: 'Giải thích trọng tâm kiến thức của bài học này một cách ngắn gọn, dễ hiểu.' },
      { label: 'Gợi ý cách giải bài tập', icon: Lightbulb, prompt: 'Gợi ý phương pháp giải các dạng bài tập điển hình của bài này.' },
      { label: 'Giải thích công thức', icon: Sparkles, prompt: 'Giải thích ý nghĩa và điều kiện áp dụng các công thức trong bài.' },
      { label: 'Em sai ở bước nào?', icon: HelpCircle, prompt: 'Những lỗi sai phổ biến mà học sinh hay mắc phải ở bài này là gì?' },
    ]
  }

  const suggestions = getSuggestions()

  return (
    <div className="ai-chat-suggestions">
      <div className="suggestions-label">
        <Sparkles size={12} aria-hidden />
        <span>Gợi ý câu hỏi nhanh</span>
      </div>
      <div className="suggestions-grid">
        {suggestions.map((item, idx) => {
          const Icon = item.icon
          return (
            <button
              key={idx}
              type="button"
              className="suggestion-chip"
              onClick={() => onSelectPrompt(item.prompt)}
            >
              <Icon size={13} className="suggestion-icon" aria-hidden />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

