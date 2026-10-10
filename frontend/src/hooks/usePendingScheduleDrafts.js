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

  const stageDraft = useCallback(async (kind, payload, createdBy = null) => {
    const current = readDrafts()
    const draft = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      kind,
      payload,
      createdBy
    }
    setPublishError('')
    try {
      await api.post('/api/schedules/validate', {
        draft,
        pendingDrafts: current
      })
      writeDrafts([...current, draft])
      return draft
    } catch (error) {
      setPublishError(
        error.message || 'Schedule conflicts must be resolved first.'
      )
      throw error
    }
  }, [])

  const removeDraft = useCallback(id => {
    writeDrafts(readDrafts().filter(draft => draft.id !== id))
  }, [])

  const updateDraft = useCallback(async (id, payload) => {
    const current = readDrafts()
    const original = current.find(draft => draft.id === id)
    if (!original) throw new Error('This pending draft no longer exists.')
    const updated = { ...original, payload }
    const others = current.filter(draft => draft.id !== id)
    setPublishError('')
    try {
      await api.post('/api/schedules/validate', {
        draft: updated,
        pendingDrafts: others
      })
      writeDrafts(current.map(draft => (draft.id === id ? updated : draft)))
      return updated
    } catch (error) {
      setPublishError(
        error.message || 'Schedule conflicts must be resolved first.'
      )
      throw error
    }
  }, [])

  const publishDrafts = useCallback(
    async (selectedDrafts = null) => {
      const batch = selectedDrafts || readDrafts()
      if (!batch.length) return
      const pendingBeforePublish = readDrafts()
      setIsPublishing(true)
      setPublishError('')
      try {
        await api.post('/api/schedules/publish', {
          drafts: batch,
          pendingDrafts: pendingBeforePublish
        })
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
