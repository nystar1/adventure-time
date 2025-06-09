import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.NEIGHBORHOOD_AIRTABLE_API_KEY }).base(
  process.env.NEIGHBORHOOD_AIRTABLE_BASE_ID
);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { showOnlyApprovedFlights, showOnlyNoFeedback } = req.query;
    
    let filterFormula = "totalTimeHackatimeHours >= 1.0";
    if (showOnlyApprovedFlights === 'true') {
      filterFormula = `AND(${filterFormula}, approvedFlightStipend = TRUE())`;
    }
    if (showOnlyNoFeedback === 'true') {
      filterFormula = `AND(${filterFormula}, gavefeedback != TRUE())`;
    }

    const neighborRecords = await base("Neighbors")
      .select({
        fields: [
          "Pfp (from slackNeighbor)",
          "Slack ID (from slackNeighbor)",
          "Full Name (from slackNeighbor)",
          "githubUsername",
          "totalTimeCombinedHours",
          "totalTimeHackatimeHours",
          "totalTimeStopwatchHours",
          "totalCheckedTime",
          "Full Name",
          "airport",
          "approvedFlightStipend",
          "move-in-date",
          "gavefeedback"
        ],
        filterByFormula: filterFormula,
        sort: [{ field: "totalTimeHackatimeHours", direction: "desc" }]
      })
      .all();

    const neighbors = neighborRecords.map(record => ({
      id: record.id,
      pfp: record.fields["Pfp (from slackNeighbor)"]?.[0]?.url || null,
      slackId: record.fields["Slack ID (from slackNeighbor)"] || null,
      slackFullName: record.fields["Full Name (from slackNeighbor)"] || null,
      githubUsername: record.fields.githubUsername || null,
      totalTimeCombinedHours: record.fields.totalTimeCombinedHours || 0,
      totalTimeHackatimeHours: Math.round(record.fields.totalTimeHackatimeHours || 0),
      totalTimeStopwatchHours: record.fields.totalTimeStopwatchHours || 0,
      fullName: record.fields["Full Name"] || null,
      totalCheckedTime: record.fields.totalCheckedTime || 0,
      airport: record.fields.airport,
      approvedFlightStipend: record.fields.approvedFlightStipend || false,
      moveInDate: record.fields["move-in-date"] || null,
      gaveFeedback: record.fields.gavefeedback || false
    }));

    return res.status(200).json({ neighbors });
  } catch (error) {
    console.error("Error fetching neighbors:", error);
    return res.status(500).json({ message: "Error fetching neighbors" });
  }
} 