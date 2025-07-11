import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.NEIGHBORHOOD_AIRTABLE_API_KEY_FIXED }).base(
  process.env.NEIGHBORHOOD_AIRTABLE_BASE_ID
);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { slackId, githubLink } = req.query;

  if (!slackId || !githubLink) {
    return res.status(400).json({ message: "Missing slackId or githubLink" });
  }

  if (!/^[a-zA-Z0-9]+$/.test(slackId)) {
    return res.status(400).json({ message: "Invalid slackId" });
  }

  try {
    // 1. Look up the neighbor's email by Slack ID
    const neighbors = await base("Neighbors")
      .select({
        filterByFormula: `{Slack ID (from slackNeighbor)} = '${slackId}'`,
        maxRecords: 1,
      })
      .all();

    console.log("DEBUG getAppShips: neighbors result", JSON.stringify(neighbors.map(n => n.fields), null, 2));

    if (!neighbors.length) {
      console.log("getAppShips: No neighbor found for slackId");
      return res.status(404).json({ message: "Neighbor not found" });
    }

    const neighborFields = neighbors[0].fields;

    const email = neighborFields.Email || neighborFields.email;
    if (!email) {
      console.log("getAppShips: Neighbor found but no Email field");
      return res.status(404).json({ message: "Neighbor email not found" });
    }

    // 2. Query ShipLog by email and githubLink
    const ships = await base("ShipLog")
      .select({
        filterByFormula: `AND({Email} = '${email}', {Github Link} = '${githubLink.replace(/'/g, "\\'")}')`
      })
      .all();

    const formatted = ships.map(ship => ({
      id: ship.id,
      codeUrl: ship.fields["Code URL"] || null,
      playableUrl: ship.fields["Playable URL"] || null,
      changesMade: ship.fields["changesMade"] || null,
      createdAt: ship.fields["Created At"] || null
    }));

    return res.status(200).json({ ships: formatted });
  } catch (error) {
    console.error("getAppShips: Error fetching ships");
    return res.status(500).json({ message: "Error fetching ships" });
  }
} 