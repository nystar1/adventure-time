import Airtable from "airtable";

const base = new Airtable({
  apiKey: process.env.NEIGHBORHOOD_AIRTABLE_API_KEY_FIXED,
}).base(process.env.NEIGHBORHOOD_AIRTABLE_BASE_ID);

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { reviewRecordId, reviewerToken, ...fields } = req.body;
  if (!reviewRecordId || !reviewerToken) {
    return res.status(400).json({ message: 'reviewRecordId and reviewerToken are required' });
  }

  try {
    const record = await base("ReviewAssignment").find(reviewRecordId);
    if (!record) {
      return res.status(404).json({ message: 'ReviewAssignment not found' });
    }
    if (
      !record.fields.reviewerToken ||
      (Array.isArray(record.fields.reviewerToken)
        ? record.fields.reviewerToken[0]
        : record.fields.reviewerToken) !== reviewerToken
    ) {
      return res.status(403).json({ message: 'Invalid reviewer token' });
    }
    // Only allow updating the mapped fields
    const allowedFields = [
      'doesLinkWork',
      'doesLinkWorkComment',
      'doFeaturesWork',
      'doFeaturesWorkComment',
      'isHighEffort',
      'isHighEffortComment',
      'feedback',
      'numberOfStars',
      'isComplete',
      'approvedPosts',
      'rejectedPosts'
    ];
    const updateFields = {};
    allowedFields.forEach(f => {
      if (fields[f] !== undefined) updateFields[f] = fields[f];
    });
    const updated = await base("ReviewAssignment").update(reviewRecordId, updateFields);
    res.status(200).json({ success: true, updated: updated.fields });
  } catch (error) {
    console.error('Error updating review assignment:', error);
    res.status(500).json({ message: 'Failed to update review assignment' });
  }
} 