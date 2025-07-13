import { cleanString } from "../../lib/airtable";
import Airtable from "airtable";

const base = new Airtable({
  apiKey: process.env.NEIGHBORHOOD_AIRTABLE_API_KEY_FIXED,
}).base(process.env.NEIGHBORHOOD_AIRTABLE_BASE_ID);

export default async function handler(req, res) {
  try {
    const { slackId, appName } = req.query;
    
    if (!slackId || !appName) {
      return res.status(400).json({ message: "Missing slackId or appName parameter" });
    }

    // Build filter formula for specific user and app (no time restrictions)
    const filterFormula = `AND(
      {slackId} = '${cleanString(slackId)}',
      {appName} = '${cleanString(appName)}'
    )`;

    const commitRecords = await base('Commits').select({
      filterByFormula: filterFormula,
      sort: [{ field: 'commitTime', direction: 'desc' }]
    }).all();

    const commits = commitRecords.map(record => {
      let duration = 0;
      if (Array.isArray(record.fields.duration)) {
        duration = record.fields.duration[0] || 0;
      } else if (typeof record.fields.duration === 'number') {
        duration = record.fields.duration;
      } else if (typeof record.fields.duration === 'string') {
        duration = parseFloat(record.fields.duration) || 0;
      }

      return {
        commitId: record.id,
        message: record.fields.message || '',
        videoLink: record.fields['videoLink'] || '',
        duration: duration,
        commitTime: record.fields['commitTime'] || '',
        appName: record.fields.appName || '',
        reviewComment: record.fields.reviewComment || '',
      };
    });

    res.status(200).json({
      commits: commits
    });
  } catch (error) {
    console.error('Error fetching app commits:', error);
    res.status(500).json({ message: 'Failed to fetch app commits', error: error.message });
  }
} 