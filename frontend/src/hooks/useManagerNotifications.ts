import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '../store/authStore'

export interface TeamCompletionEvent {
  employeeName: string
  courseTitle: string
}

const SOCKET_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

/** Connects managers to `user:<id>` for live completion notifications. */
export function useManagerNotifications() {
  const user = useAuthStore((s) => s.user)
  const [toast, setToast] = useState<TeamCompletionEvent | null>(null)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!user || user.role !== 'MANAGER') return

    const socket = io(SOCKET_URL, {
      query: { userId: user.id },
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('team-member-completed-course', (payload: TeamCompletionEvent) => {
      setToast(payload)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [user])

  return {
    toast,
    clearToast: () => setToast(null),
  }
}
