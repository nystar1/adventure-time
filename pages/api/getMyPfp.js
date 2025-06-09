import Airtable from "airtable";

const base = new Airtable({
  apiKey: process.env.NEIGHBORHOOD_AIRTABLE_API_KEY,
}).base(process.env.NEIGHBORHOOD_AIRTABLE_BASE_ID);

export default async function handler(req, res) {
  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ message: 'Missing token' });
  }
  try {
    // Find the neighbor with this reviewerToken
    const records = await base('Neighbors').select({
      filterByFormula: `{token} = '${token}'`,
      maxRecords: 1
    }).firstPage();
    if (!records.length) {
      return res.status(404).json({ message: 'Reviewer not found' });
    }
    const pfp = records[0].fields.Pfp || null;
    const slackId = records[0].fields["Slack ID (from slackNeighbor)"] || null;
    res.status(200).json({ pfp, slackId });
  } catch (error) {
    console.error('Error fetching pfp:', error);
    res.status(500).json({ message: 'Failed to fetch pfp' });
  }
} 