import Airtable from "airtable";

const base = new Airtable({
  apiKey: process.env.NEIGHBORHOOD_AIRTABLE_API_KEY_FIXED,
}).base(process.env.NEIGHBORHOOD_AIRTABLE_BASE_ID);

export default async function handler(req, res) {
  try {
    const { slackId, appName } = req.query;
    
    if (!slackId) {
      return res.status(400).json({ message: "Missing slackId parameter" });
    }

    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() + diff);
    startOfWeek.setHours(0, 0, 0, 0); // Monday 00:00 PDT

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 0, 0); // Sunday 23:59 PDT

    const startDateStr = new Date(startOfWeek.getTime() + (7 * 60 * 60 * 1000)).toISOString(); // Convert PDT to UTC
    const endDateStr = new Date(endOfWeek.getTime() + (7 * 60 * 60 * 1000)).toISOString();

    // Build filter formula
    let filterFormula = `AND(
      {slackId} = '${slackId}',
      IS_AFTER({commitTime}, '${startDateStr}'),
      IS_BEFORE({commitTime}, '${endDateStr}')
    )`;
    
    // Add appName filter if provided
    if (appName) {
      filterFormula = `AND(
        {slackId} = '${slackId}',
        {appName} = '${appName}',
        IS_AFTER({commitTime}, '${startDateStr}'),
        IS_BEFORE({commitTime}, '${endDateStr}')
      )`;
    }

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
      };
    });

    res.status(200).json({
      weekStart: startOfWeek.toISOString(),
      weekEnd: endOfWeek.toISOString(),
      commits: commits
    });
  } catch (error) {
    console.error('Error fetching weekly in-person commits:', error);
    res.status(500).json({ message: 'Failed to fetch weekly commits', error: error.message });
  }
}
