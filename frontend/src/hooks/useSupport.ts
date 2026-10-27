import { useCallback, useEffect, useState } from 'react'
import { supportService } from '@/services/support.service'
import type {
  SupportTicketItem,
  SupportTicketMessage,
  SupportUserProfile,
  TicketStatus,
} from '@/types/support'

export function useSupportDashboard() {
  const [data, setData] = useState<Awaited<ReturnType<typeof supportService.getDashboardSummary>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await supportService.getDashboardSummary()
      setData(res)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải bảng điều khiển hỗ trợ')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    supportService
      .getDashboardSummary()
      .then((res) => {
        if (!isMounted) return
        setData(res)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : 'Lỗi khi tải bảng điều khiển hỗ trợ')
        setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  return { data, loading, error, refresh: load }
}

export function useSupportTickets(initialCategory = 'all', initialPriority = 'all', initialStatus = 'all', initialSearch = '') {
  const [tickets, setTickets] = useState<SupportTicketItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState(initialCategory)
  const [priority, setPriority] = useState(initialPriority)
  const [status, setStatus] = useState(initialStatus)
  const [search, setSearch] = useState(initialSearch)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await supportService.getTickets(category, priority, status, search)
      setTickets(res)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải danh sách ticket')
    } finally {
      setLoading(false)
    }
  }, [category, priority, status, search])

  useEffect(() => {
    let isMounted = true
    supportService
      .getTickets(category, priority, status, search)
      .then((res) => {
        if (!isMounted) return
        setTickets(res)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : 'Lỗi khi tải danh sách ticket')
        setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [category, priority, status, search])

  return {
    tickets,
    loading,
    error,
    category,
    setCategory,
    priority,
    setPriority,
    status,
    setStatus,
    search,
    setSearch,
    refresh: load,
  }
}

export function useSupportTicketDetail(ticketId: string) {
  const [ticket, setTicket] = useState<SupportTicketItem | null>(null)
  const [messages, setMessages] = useState<SupportTicketMessage[]>([])
  const [userProfile, setUserProfile] = useState<SupportUserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await supportService.getTicketDetail(ticketId)
      if (!res.ticket) {
        setError('Không tìm thấy ticket')
      } else {
        setTicket(res.ticket)
        setMessages(res.messages)
        setUserProfile(res.userProfile)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải chi tiết ticket')
    } finally {
      setLoading(false)
    }
  }, [ticketId])

  useEffect(() => {
    let isMounted = true
    supportService
      .getTicketDetail(ticketId)
      .then((res) => {
        if (!isMounted) return
        if (!res.ticket) {
          setError('Không tìm thấy ticket')
        } else {
          setTicket(res.ticket)
          setMessages(res.messages)
          setUserProfile(res.userProfile)
        }
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : 'Lỗi khi tải chi tiết ticket')
        setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [ticketId])

  const sendReply = async (messageText: string) => {
    const msg = await supportService.sendReply(ticketId, messageText)
    setMessages((prev) => [...prev, msg])
    return msg
  }

  const updateStatus = async (newStatus: TicketStatus) => {
    const ok = await supportService.updateTicketStatus(ticketId, newStatus)
    if (ok && ticket) {
      setTicket({ ...ticket, status: newStatus })
    }
    return ok
  }

  return { ticket, messages, userProfile, loading, error, sendReply, updateStatus, refresh: load }
}

export function useUserLookup() {
  const [profile, setProfile] = useState<SupportUserProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchUser = useCallback(async (query: string) => {
    if (!query.trim()) {
      setProfile(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await supportService.lookupUser(query)
      if (!res) {
        setError('Không tìm thấy người dùng phù hợp')
        setProfile(null)
      } else {
        setProfile(res)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tìm kiếm')
    } finally {
      setLoading(false)
    }
  }, [])

  return { profile, loading, error, searchUser }
}
