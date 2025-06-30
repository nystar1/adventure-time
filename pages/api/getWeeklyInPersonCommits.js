import Airtable from "airtable";

const base = new Airtable({
  apiKey: process.env.NEIGHBORHOOD_AIRTABLE_API_KEY,
}).base(process.env.NEIGHBORHOOD_AIRTABLE_BASE_ID);

export default async function handler(req, res) {
  try {
    // Get current time and convert to PDT
    const now = new Date();

    // Determine previous Monday 00:00 PDT and upcoming Sunday 23:59 PDT
    const pdtOffset = -7 * 60; // PDT offset in minutes (-7h)
    const utcOffsetMs = pdtOffset * 60 * 1000;

    const localNow = new Date(now.getTime() + utcOffsetMs);
    const day = localNow.getDay(); // Sunday=0, Monday=1,... Saturday=6
    const mondayOffset = day === 0 ? -6 : 1 - day;

    const startOfWeek = new Date(localNow);
    startOfWeek.setDate(localNow.getDate() + mondayOffset);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 0, 0); // End at 23:59 PDT on Sunday

    const startDateStr = new Date(startOfWeek.getTime() - utcOffsetMs).toISOString();
    const endDateStr = new Date(endOfWeek.getTime() - utcOffsetMs).toISOString();

    const neighborRecords = await base("Neighbors")
      .select({
        filterByFormula: `{isIRL} = 1`,
      })
      .all();

    const commitsByUser = {};

    for (const neighbor of neighborRecords) {
      const slackId = neighbor.fields["Slack ID (from slackNeighbor)"];
      if (!slackId) continue;

      const commitRecords = await base('Commits').select({
        filterByFormula: `AND(
          {slackId} = '${slackId}',
          IS_AFTER({commitTime}, '${startDateStr}'),
          IS_BEFORE({commitTime}, '${endDateStr}')
        )`,
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

      const totalMinutes = commits.reduce((total, commit) => total + commit.duration, 0);

      commitsByUser[slackId] = {
        slackId,
        fullName: neighbor.fields["Full Name (from slackNeighbor)"] || null,
        slackFullName: neighbor.fields["Full Name (from slackNeighbor)"] || null,
        pfp: neighbor.fields["Pfp (from slackNeighbor)"]?.[0]?.url || null,
        commits,
        totalMinutes
      };
    }

    const result = Object.values(commitsByUser);

    res.status(200).json({
      weekStart: startDateStr,
      weekEnd: endDateStr,
      users: result
    });
  } catch (error) {
    console.error('Error fetching weekly in-person commits:', error);
    res.status(500).json({ message: 'Failed to fetch weekly commits', error: error.message });
  }
}
