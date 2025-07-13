import Airtable from "airtable";
import { cleanString } from "../../lib/airtable";

const base = new Airtable({
  apiKey: process.env.NEIGHBORHOOD_AIRTABLE_API_KEY_FIXED,
}).base(process.env.NEIGHBORHOOD_AIRTABLE_BASE_ID);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ message: 'Token is required' });
  }

  try {
    const cleanedToken = cleanString(token)
    const records = await base("ReviewAssignment")
      .select({
        filterByFormula: `{reviewerToken} = '${cleanedToken}'`,
        sort: [{ field: "createdAt", direction: "desc" }]
      })
      .all();

    const tasks = records.map(record => ({
      id: record.id,
      projectName: record.fields.projectName || 'Unnamed Project',
      slackPfp: record.fields.reviewedNeighborPfp?.[0]?.url || null,
      slackHandle: record.fields.reviewedNeighborSlackHandle || 'Unknown',
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