import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.NEIGHBORHOOD_AIRTABLE_API_KEY_FIXED }).base(
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
          "GrantedHours",
          "weightedGrantsContribution",
          "stay",
          "approvedFlightStipend",
          "country"
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
    
    // Get stay information if available
    let stayInfo = {
      startDate: null,
      endDate: null,
      houseName: null,
      bookingStatus: null
    };
    
    if (neighbor.fields.stay && neighbor.fields.stay.length > 0) {
      // Get all stays for this neighbor
      const stayRecords = await base("stay")
        .select({
          fields: [
            "start_date",
            "end_date",
            "bookingStatus",
            "houseName"
          ],
          filterByFormula: `RECORD_ID() = '${neighbor.fields.stay[0]}'`
        })
        .firstPage();
      
      if (stayRecords.length > 0) {
        const stay = stayRecords[0];
        stayInfo = {
          startDate: stay.fields.start_date || null,
          endDate: stay.fields.end_date || null,
          houseName: stay.fields.houseName && stay.fields.houseName.length > 0 
            ? stay.fields.houseName[0] 
            : null,
          bookingStatus: stay.fields.bookingStatus || null
        };
      }
    }

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

    // Calculate flight stipend amount based on approvedFlightStipend and country
    let stipendAmount = 0;
    const approvedFlightStipend = neighbor.fields.approvedFlightStipend || false;
    const country = neighbor.fields.country || "";
    
    if (approvedFlightStipend === true) {
      stipendAmount = country === "US" ? 500 : 750;
    }

    const slackHandle = record.fields["Slack Handle (from slackNeighbor)"] || null

    // Prepare the response
    const response = {
      neighbor: {
        id: neighbor.id,
        pfp: neighbor.fields["Pfp (from slackNeighbor)"]?.[0]?.url || null,
        slackId: neighbor.fields["Slack ID (from slackNeighbor)"] || null,
        slackFullName: slackHandle,
        slackHandle: slackHandle,
        githubUsername: neighbor.fields.githubUsername || null,
        totalTimeCombinedHours: Math.round(neighbor.fields.totalTimeCombinedHours || 0),
        totalTimeHackatimeHours: Math.round(neighbor.fields.totalTimeHackatimeHours || 0),
        totalTimeStopwatchHours: Math.round(neighbor.fields.totalTimeStopwatchHours || 0),
        fullName: slackHandle,
        grantedHours: neighbor.fields.GrantedHours || 0,
        weightedGrantsContribution: neighbor.fields.weightedGrantsContribution || 0,
        startDate: stayInfo.startDate,
        endDate: stayInfo.endDate,
        houseName: stayInfo.houseName,
        bookingStatus: stayInfo.bookingStatus,
        approvedFlightStipend: approvedFlightStipend,
        country: country,
        stipendAmount: stipendAmount
      },
      apps: sortedApps
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching neighbor details:", error);
    return res.status(500).json({ message: "Error fetching neighbor details" });
  }
} 