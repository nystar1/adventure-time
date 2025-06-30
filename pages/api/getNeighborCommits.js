import Airtable from "airtable";

const base = new Airtable({
  apiKey: process.env.NEIGHBORHOOD_AIRTABLE_API_KEY,
}).base(process.env.NEIGHBORHOOD_AIRTABLE_BASE_ID);

export default async function handler(req, res) {
  try {
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
      weekStart: startOfWeek.toISOString(),
      weekEnd: endOfWeek.toISOString(),
      users: result
    });
  } catch (error) {
    console.error('Error fetching weekly in-person commits:', error);
    res.status(500).json({ message: 'Failed to fetch weekly commits', error: error.message });
  }
}
