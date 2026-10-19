import { useCallback, useEffect, useRef, useState } from 'react'

interface UseAutoScrollOptions {
  threshold?: number
}

export function useAutoScroll({ threshold = 80 }: UseAutoScrollOptions = {}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const isAutoScrollingRef = useRef(false)

  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el || isAutoScrollingRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = el
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight)
    setIsAtBottom(distanceFromBottom <= threshold)
  }, [threshold])

  const scrollToBottom = useCallback((smooth = true) => {
    const el = containerRef.current
    if (!el) return

    isAutoScrollingRef.current = true
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    })

    // Reset flag after animation completes
    setTimeout(() => {
      isAutoScrollingRef.current = false
      setIsAtBottom(true)
    }, 200)
  }, [])

  // Auto-scroll when dependencies update only if user was already at bottom
  const scrollIfNearBottom = useCallback(() => {
    if (isAtBottom) {
      scrollToBottom(false)
    }
  }, [isAtBottom, scrollToBottom])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  return {
    containerRef,
    isAtBottom,
    scrollToBottom,
    scrollIfNearBottom,
  }
}
