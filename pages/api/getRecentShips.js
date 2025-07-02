import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.NEIGHBORHOOD_AIRTABLE_API_KEY_FIXED }).base(
  process.env.NEIGHBORHOOD_AIRTABLE_BASE_ID
);

function escapeAirtableString(str) {
  return String(str).replace(/'/g, "\\'");
}

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

    console.log("getRecentShips: fetched ships count", ships.length);

    // For each ship, look up the neighbor by email to get the slackId
    const emailToSlackId = {};
    const emails = ships.map(ship => ship.fields["Email"]).filter(Boolean);
    console.log("getRecentShips: unique emails count", new Set(emails).size);

    // Batch fetch neighbors by email
    if (emails.length > 0) {
      const emailFilters = emails.map(email => `{email} = '${escapeAirtableString(email)}'`);
      if (emailFilters.length > 0) {
        const filter = `OR(${emailFilters.join(",")})`;
        console.log("getRecentShips: neighbor filterByFormula", filter);
        const neighborRecords = await base("Neighbors")
          .select({
            filterByFormula: filter,
            fields: ["email", "Slack ID (from slackNeighbor)"]
          })
          .all();
        neighborRecords.forEach(n => {
          if (n.fields.email && n.fields["Slack ID (from slackNeighbor)"]) {
            emailToSlackId[n.fields.email] = n.fields["Slack ID (from slackNeighbor)"];
          }
        });
        console.log("getRecentShips: neighborRecords count", neighborRecords.length);
      }
    }

    // Gather all app names from ships
    const appNames = ships.map(ship => ship.fields["App Name"] || ship.fields["appName"]).filter(Boolean);
    console.log("getRecentShips: unique appNames count", new Set(appNames).size);
    // Batch fetch canonical app names from Apps table
    let appNameToCanonical = {};
    if (appNames.length > 0) {
      const appNameFilters = appNames.map(name => `{Name} = '${escapeAirtableString(name)}'`);
      if (appNameFilters.length > 0) {
        const filter = `OR(${appNameFilters.join(",")})`;
        console.log("getRecentShips: app filterByFormula", filter);
        const appRecords = await base("Apps")
          .select({
            filterByFormula: filter,
            fields: ["Name"]
          })
          .all();
        appRecords.forEach(app => {
          if (app.fields.Name) {
            appNameToCanonical[app.fields.Name] = app.fields.Name;
          }
        });
        console.log("getRecentShips: appRecords count", appRecords.length);
      }
    }

    const formatted = ships.map(ship => {
      const appName = ship.fields["App Name"] || ship.fields["appName"] || null;
      return {
        id: ship.id,
        appName,
        canonicalAppName: appNameToCanonical[appName] || appName,
        createdAt: ship.fields["Created At"] || null,
        changesMade: ship.fields["changesMade"] || null,
        codeUrl: ship.fields["Code URL"] || null,
        playableUrl: ship.fields["Playable URL"] || null,
        slackId: emailToSlackId[ship.fields["Email"]] || null
      };
    });

    console.log("getRecentShips: formatted ships count", formatted.length);

    return res.status(200).json({ ships: formatted });
  } catch (error) {
    console.error("getRecentShips: Error fetching ships", error.message);
    return res.status(500).json({ message: "Error fetching ships", error: error.message });
  }
} 