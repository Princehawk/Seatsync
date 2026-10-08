import { useCallback, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

const STORAGE_KEY = 'seatsync-pending-schedule-drafts'
const CHANGE_EVENT = 'seatsync-pending-schedule-drafts-changed'

const readDrafts = () => {
  if (typeof window === 'undefined') return []
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

const writeDrafts = drafts => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts))
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT))
}

export default function usePendingScheduleDrafts () {
  const queryClient = useQueryClient()
  const [drafts, setDrafts] = useState(readDrafts)
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishError, setPublishError] = useState('')

  useEffect(() => {
    const sync = () => setDrafts(readDrafts())
    window.addEventListener(CHANGE_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const stageDraft = useCallback((kind, payload, createdBy = null) => {
    const next = [
      ...readDrafts(),
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        kind,
        payload,
        createdBy
      }
    ]
    writeDrafts(next)
    setPublishError('')
  }, [])

  const removeDraft = useCallback(id => {
    writeDrafts(readDrafts().filter(draft => draft.id !== id))
  }, [])

  const updateDraft = useCallback((id, payload) => {
    writeDrafts(
      readDrafts().map(draft =>
        draft.id === id ? { ...draft, payload } : draft
      )
    )
  }, [])

  const publishDrafts = useCallback(
    async (selectedDrafts = null) => {
      const batch = selectedDrafts || readDrafts()
      if (!batch.length) return
      setIsPublishing(true)
      setPublishError('')
      try {
        await api.post('/api/schedules/publish', { drafts: batch })
        const publishedIds = new Set(batch.map(draft => draft.id))
        writeDrafts(readDrafts().filter(draft => !publishedIds.has(draft.id)))
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['timetable'] }),
          queryClient.invalidateQueries({ queryKey: ['exams'] }),
          queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
          queryClient.invalidateQueries({ queryKey: ['venues'] })
        ])
      } catch (error) {
        setPublishError(
          error.message ||
            'Unable to publish schedule drafts. Nothing was added to the timetable.'
        )
        throw error
      } finally {
        setIsPublishing(false)
      }
    },
    [queryClient]
  )

  return {
    drafts,
    stageDraft,
    removeDraft,
    updateDraft,
    publishDrafts,
    isPublishing,
    publishError
  }
}
