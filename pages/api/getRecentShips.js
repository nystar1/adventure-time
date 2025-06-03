import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.NEIGHBORHOOD_AIRTABLE_API_KEY }).base(
  process.env.NEIGHBORHOOD_AIRTABLE_BASE_ID
);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const limit = parseInt(req.query.limit, 10) || 100;

  try {
    const ships = await base("ShipLog")
      .select({
        sort: [{ field: "Created At", direction: "desc" }],
        maxRecords: limit,
      })
      .all();

    // For each ship, look up the neighbor by email to get the slackId
    const emailToSlackId = {};
    const emails = ships.map(ship => ship.fields["Email"]).filter(Boolean);

    // Batch fetch neighbors by email
    if (emails.length > 0) {
      const neighborRecords = await base("Neighbors")
        .select({
          filterByFormula: `OR(${emails.map(email => `{email} = '${email}'`).join(",")})`,
          fields: ["email", "Slack ID (from slackNeighbor)"]
        })
        .all();
      neighborRecords.forEach(n => {
        if (n.fields.email && n.fields["Slack ID (from slackNeighbor)"]) {
          emailToSlackId[n.fields.email] = n.fields["Slack ID (from slackNeighbor)"];
        }
      });
    }

    const formatted = ships.map(ship => ({
      id: ship.id,
      appName: ship.fields["App Name"] || ship.fields["appName"] || null,
      createdAt: ship.fields["Created At"] || null,
      changesMade: ship.fields["changesMade"] || null,
      codeUrl: ship.fields["Code URL"] || null,
      playableUrl: ship.fields["Playable URL"] || null,
      slackId: emailToSlackId[ship.fields["Email"]] || null
    }));

    return res.status(200).json({ ships: formatted });
  } catch (error) {
    console.error("getRecentShips: Error fetching ships");
    return res.status(500).json({ message: "Error fetching ships" });
  }
} 