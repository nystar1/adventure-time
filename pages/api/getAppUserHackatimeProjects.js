import { cleanString } from "../../lib/airtable";
import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.NEIGHBORHOOD_AIRTABLE_API_KEY_FIXED }).base(
  process.env.NEIGHBORHOOD_AIRTABLE_BASE_ID
);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { slackId, appName } = req.query;

  if (!slackId || !appName) {
    return res.status(400).json({ message: "Missing slackId or appName" });
  }

  try {
    // Lookup neighbor by Slack ID
    const neighborRecords = await base("Neighbors")
      .select({
        fields: ["Slack ID (from slackNeighbor)", "Slack Handle (from slackNeighbor)", "githubUsername"],
        filterByFormula: `{Slack ID (from slackNeighbor)} = '${cleanString(slackId)}'`,
        maxRecords: 1
      })
      .firstPage();
    if (neighborRecords.length === 0) {
      return res.status(404).json({ message: "Neighbor not found" });
    }
    const neighbor = neighborRecords[0];
    const githubUsername = neighbor.fields.githubUsername || null;

    // Lookup app by name (case-insensitive, trimmed)
    const appNameLower = appName;
    const appRecords = await base("Apps")
      .select({
        fields: ["Name"],
        filterByFormula: `{Name} = '${appNameLower}'`, // no need
        maxRecords: 1
      })
      .firstPage();
    if (appRecords.length === 0) {
      return res.status(404).json({ message: "App not found" });
    }
    const app = appRecords[0];
    const appId = app.id;

    // Query hackatimeProjects where slackId matches and the app name matches
    const projects = await base("hackatimeProjects")
      .select({
        filterByFormula: `AND({slackId} = '${cleanString(slackId)}', {Name (from Apps)} = '${cleanString(appName)}')`
      })
      .all();

    // Format the results
    const formatted = projects.map(project => ({
      id: project.id,
      name: project.fields.name || null,
      description: project.fields.description || null,
      commits: project.fields.commits || [],
      neighbor: project.fields.neighbor || [],
      apps: project.fields.Apps || [],
      createdAt: project.fields.createdAt || null,
      githubLink: project.fields.githubLink || null,
      githubUsername
    }));

    return res.status(200).json({ projects: formatted });
  } catch (error) {
    console.error("Error fetching hackatime projects:", error);
    return res.status(500).json({ message: "Error fetching hackatime projects" });
  }
} 