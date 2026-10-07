import { publishScheduleDrafts } from '../services/schedulePublishService.js'

export const publishScheduleDraftsController = async (req, res) => {
  try {
    const data = await publishScheduleDrafts(req.body?.drafts, req.user)
    return res.json({ success: true, data })
  } catch (error) {
    return res.status(409).json({
      success: false,
      message: error.message || 'Unable to publish schedule drafts. No changes were committed.'
    })
  }
}
