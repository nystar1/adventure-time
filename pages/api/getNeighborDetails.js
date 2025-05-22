import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.NEIGHBORHOOD_AIRTABLE_API_KEY }).base(
  process.env.NEIGHBORHOOD_AIRTABLE_BASE_ID
);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { slackId } = req.query;

  if (!slackId) {
    return res.status(400).json({ message: "Missing slackId" });
  }

  try {
    // Get the neighbor's details
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
          "Full Name",
          "Apps",
          "GrantedHours"
        ],
        filterByFormula: `{Slack ID (from slackNeighbor)} = '${slackId}'`,
        maxRecords: 1
      })
      .firstPage();

    if (neighborRecords.length === 0) {
      return res.status(404).json({ message: "Neighbor not found" });
    }

    const neighbor = neighborRecords[0];
    const neighborId = neighbor.id;

    // Get all apps
    const allApps = await base("Apps")
      .select({
        fields: ["Name", "Icon", "Description", "Neighbors", "createdAt"],
      })
      .all();

    // Filter apps that the neighbor is a member of
    const neighborApps = allApps
      .filter(app => {
        const neighbors = app.fields.Neighbors || [];
        return neighbors.includes(neighborId);
      })
      .map(app => ({
        id: app.id,
        name: app.fields.Name || "Unnamed App",
        icon: app.fields.Icon ? (
          typeof app.fields.Icon === 'string' ? app.fields.Icon :
          Array.isArray(app.fields.Icon) && app.fields.Icon.length > 0 ? app.fields.Icon[0].url :
          null
        ) : null,
        description: app.fields.Description || "",
        memberCount: (app.fields.Neighbors || []).length,
        createdAt: app.fields.createdAt || null
      }));

    // Sort apps by member count (descending)
    const sortedApps = neighborApps.sort((a, b) => b.memberCount - a.memberCount);

    // Prepare the response
    const response = {
      neighbor: {
        id: neighbor.id,
        pfp: neighbor.fields["Pfp (from slackNeighbor)"]?.[0]?.url || null,
        slackId: neighbor.fields["Slack ID (from slackNeighbor)"] || null,
        slackFullName: neighbor.fields["Full Name (from slackNeighbor)"] || null,
        githubUsername: neighbor.fields.githubUsername || null,
        totalTimeCombinedHours: Math.round(neighbor.fields.totalTimeCombinedHours || 0),
        totalTimeHackatimeHours: Math.round(neighbor.fields.totalTimeHackatimeHours || 0),
        totalTimeStopwatchHours: Math.round(neighbor.fields.totalTimeStopwatchHours || 0),
        fullName: neighbor.fields["Full Name"] || null,
        grantedHours: neighbor.fields.GrantedHours || 0
      },
      apps: sortedApps
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching neighbor details:", error);
    return res.status(500).json({ message: "Error fetching neighbor details" });
  }
} 