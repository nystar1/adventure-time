import Airtable from "airtable";

const base = new Airtable({
  apiKey: process.env.NEIGHBORHOOD_AIRTABLE_API_KEY,
}).base(process.env.NEIGHBORHOOD_AIRTABLE_BASE_ID);

// Helper function to filter out email addresses
const filterEmails = (text) => {
  if (!text) return text;
  return text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL REDACTED]');
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { reviewRecordId } = req.query;

  if (!reviewRecordId) {
    return res.status(400).json({ message: 'reviewRecordId is required' });
  }

  try {
    const record = await base("ReviewAssignment").find(reviewRecordId);
    if (!record) {
      return res.status(404).json({ message: 'ReviewAssignment not found' });
    }
    res.status(200).json({
      contributor: filterEmails(Array.isArray(record.fields.reviewedNeighborSlackHandle)
        ? record.fields.reviewedNeighborSlackHandle[0]
        : record.fields.reviewedNeighborSlackHandle || record.fields.reviewedNeighbor || null),
      app: filterEmails(Array.isArray(record.fields.projectName)
        ? record.fields.projectName[0]
        : record.fields.projectName || record.fields.reviewedApp || null),
      projectName: filterEmails(Array.isArray(record.fields.projectName)
        ? record.fields.projectName[0]
        : record.fields.projectName || null),
      neighborSlackId: filterEmails(Array.isArray(record.fields.reviewedNeighborSlackId)
        ? record.fields.reviewedNeighborSlackId[0]
        : record.fields.reviewedNeighborSlackId || null),
      reviewedApp: filterEmails(Array.isArray(record.fields.reviewedApp)
        ? record.fields.reviewedApp[0]
        : record.fields.reviewedApp || null),
      recordFields: Object.fromEntries(
        Object.entries(record.fields).map(([key, value]) => [
          key,
          typeof value === 'string' ? filterEmails(value) : value
        ])
      )
    });
  } catch (error) {
    console.error('Error fetching review assignment:', error);
    res.status(500).json({ message: 'Failed to fetch review assignment' });
  }
} 