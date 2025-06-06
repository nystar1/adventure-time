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

  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ message: 'Token is required' });
  }

  try {
    const records = await base("ReviewAssignment")
      .select({
        filterByFormula: `{reviewerToken} = '${token}'`,
        sort: [{ field: "createdAt", direction: "desc" }]
      })
      .all();

    const tasks = records.map(record => ({
      id: record.id,
      projectName: filterEmails(record.fields.projectName) || 'Unnamed Project',
      slackPfp: record.fields.reviewedNeighborPfp?.[0]?.url || null,
      slackHandle: filterEmails(record.fields.reviewedNeighborSlackHandle) || 'Unknown',
      status: record.fields.status || 'pending',
      postId: record.fields.postId,
      isComplete: record.fields.isComplete || false,
    }));

    res.status(200).json({ tasks });
  } catch (error) {
    console.error('Error fetching review tasks:', error);
    res.status(500).json({ message: 'Failed to fetch review tasks' });
  }
} 