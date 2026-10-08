import { publishScheduleDrafts } from '../services/schedulePublishService.js'
import { emitSocketEvent } from '../socket/socketEvents.js'

export const publishScheduleDraftsController = async (req, res) => {
  try {
    const data = await publishScheduleDrafts(req.body?.drafts, req.user)
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
