import Airtable from "airtable";

const base = new Airtable({
  apiKey: process.env.NEIGHBORHOOD_AIRTABLE_API_KEY,
}).base(process.env.NEIGHBORHOOD_AIRTABLE_BASE_ID);

export default async function handler(req, res) {
  const { slackId, appName } = req.query;
  
  if (!slackId) {
    return res.status(400).json({ message: 'Missing slackId parameter' });
  }

  try {
    // Build filter formula based on provided parameters
    let filterFormula = `{slackId} = '${slackId}'`;
    
    // If appName is provided, add it to the filter
    if (appName) {
      filterFormula = `AND(${filterFormula}, {appName} = '${appName}')`;
    }
    
    // Fetch commits using the filter formula
    const commitRecords = await base('Commits').select({
      filterByFormula: filterFormula,
      sort: [{ field: 'commitTime', direction: 'desc' }]
    }).all();
    
    const commits = commitRecords.map(record => ({
      commitId: record.id,
      message: record.fields.message || '',
      videoLink: record.fields['videoLink'] || '',
      duration: record.fields.duration || 0,
      commitTime: record.fields['commitTime'] || '',
      appName: record.fields.appName || '',
    }));
    
    res.status(200).json({ commits });
  } catch (error) {
    console.error('Error fetching neighbor commits:', error);
    res.status(500).json({ message: 'Failed to fetch commits', error: error.message });
  }
} 