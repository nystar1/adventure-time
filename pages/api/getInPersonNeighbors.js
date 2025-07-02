import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.NEIGHBORHOOD_AIRTABLE_API_KEY_FIXED }).base(
  process.env.NEIGHBORHOOD_AIRTABLE_BASE_ID
);

// Helper function to get start and end of current week in PDT
function getWeekDates() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
  const startOfWeek = new Date(now);
  const dayOfWeek = startOfWeek.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  startOfWeek.setDate(startOfWeek.getDate() + diff);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return {
    start: Math.floor(startOfWeek.getTime() / 1000),
    end: Math.floor(endOfWeek.getTime() / 1000)
  };
}

async function getHackatimeData(slackId) {
  try {
    const response = await fetch(
      `https://hackatime.hackclub.com/api/v1/users/${slackId}/heartbeats/spans`,
      {
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Hackatime API responded with status: ${response.status}`);
    }

    const data = await response.json();
    const { start, end } = getWeekDates();

    const totalHours = data.spans
      .filter(span => span.end_time >= start && span.end_time <= end)
      .reduce((sum, span) => sum + (span.duration || 0), 0) / 3600;

    return totalHours;
  } catch (error) {
    console.error(`Error fetching Hackatime data for ${slackId}:`, error);
    return 0;
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const neighborRecords = await base("Neighbors")
      .select({
        fields: [
          "Pfp (from slackNeighbor)",
          "Slack ID (from slackNeighbor)",
          "Full Name (from slackNeighbor)",
          "githubUsername",
          "Full Name",
          "airport",
          "isIRL"
        ],
        filterByFormula: "isIRL = TRUE()"
      })
      .all();

    const neighborsWithHours = await Promise.all(
      neighborRecords.map(async (record) => {
        const slackId = record.fields["Slack ID (from slackNeighbor)"];
        const weeklyHours = slackId ? await getHackatimeData(slackId) : 0;

        return {
          id: record.id,
          pfp: record.fields["Pfp (from slackNeighbor)"]?.[0]?.url || null,
          slackId: slackId || null,
          slackFullName: record.fields["Full Name (from slackNeighbor)"] || null,
          githubUsername: record.fields.githubUsername || null,
          fullName: record.fields["Full Name"] || null,
          airport: record.fields.airport,
          isIRL: record.fields.isIRL || false,
          weeklyHours: Math.round(weeklyHours * 10) / 10
        };
      })
    );

    const sortedNeighbors = neighborsWithHours.sort((a, b) => b.weeklyHours - a.weeklyHours);

    return res.status(200).json({ neighbors: sortedNeighbors });
  } catch (error) {
    console.error("Error fetching in-person neighbors:", error);
    return res.status(500).json({ message: "Error fetching in-person neighbors" });
  }
}
