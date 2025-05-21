import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.NEIGHBORHOOD_AIRTABLE_API_KEY }).base(
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
    // Find all hackatimeProjects for this app and user
    const projects = await base("hackatimeProjects")
      .select({
        filterByFormula: `AND({slackId} = '${slackId}', {Name (from Apps)} = '${appName}')`
      })
      .all();

    // For each project, fetch Hackatime API and sum durations
    let totalDuration = 0;
    for (const project of projects) {
      const projectName = project.fields.name;
      if (!projectName) continue;
      try {
        const response = await fetch(
          `https://hackatime.hackclub.com/api/v1/users/${slackId}/heartbeats/spans?project=${encodeURIComponent(projectName)}`,
          { headers: { 'Accept': 'application/json' } }
        );
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data.spans)) {
            totalDuration += data.spans.reduce((sum, span) => sum + (span.duration || 0), 0);
          }
        }
      } catch (err) {
        // Ignore errors for individual projects
      }
    }

    // Return total in seconds and hours
    return res.status(200).json({
      totalSeconds: totalDuration,
      totalHours: (totalDuration / 3600).toFixed(1)
    });
  } catch (error) {
    console.error("Error fetching total hours for project/user:", error);
    return res.status(500).json({ message: "Error fetching total hours for project/user" });
  }
} 