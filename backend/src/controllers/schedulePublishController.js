import {
  publishScheduleDrafts,
  validateScheduleDraft
} from '../services/schedulePublishService.js'
import { emitSocketEvent } from '../socket/socketEvents.js'

export const validateScheduleDraftController = async (req, res) => {
  try {
    await validateScheduleDraft(
      req.body?.draft,
      req.body?.pendingDrafts,
      req.user
    )
    return res.json({ valid: true })
  } catch (error) {
    return res.status(409).json({ valid: false, message: error.message })
  }
}

export const publishScheduleDraftsController = async (req, res) => {
  try {
    const data = await publishScheduleDrafts(
      req.body?.drafts,
      req.user,
      req.body?.pendingDrafts
    )
    if (data?.length) {
      console.info('[SCHEDULE][PUBLISHED]', JSON.stringify(data))
      emitSocketEvent('timetable:changed', {
        action: 'published',
        ids: data.map(item => Number(item.id)).filter(Boolean)
      })
    }
    return res.json({ success: true, data })
  } catch (error) {
    return res.status(409).json({
      success: false,
      message:
        error.message ||
        'Unable to publish schedule drafts. No changes were committed.'
    })
  }
}
