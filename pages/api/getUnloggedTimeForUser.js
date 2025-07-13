import Airtable from "airtable";
import { cleanString } from "../../lib/airtable";

const base = new Airtable({ apiKey: process.env.NEIGHBORHOOD_AIRTABLE_API_KEY_FIXED }).base(
  process.env.NEIGHBORHOOD_AIRTABLE_BASE_ID
);

async function getUnloggedTimeForApp(slackId, appName) {
  // 1. Get all hackatimeProjects for this user/app
  const cleanedSlackId = cleanString(slackId);
  const cleanedAppName = cleanString(appName);
  const projects = await base("hackatimeProjects")
    .select({
      filterByFormula: `AND({slackId} = '${cleanedSlackId}', {Name (from Apps)} = '${cleanedAppName}')`
    })
    .all();

  // 2. For each project, fetch Hackatime spans
  let allSpans = [];
  for (const project of projects) {
    const cleanedProjectName = cleanString(project.fields.name);
    if (!cleanedProjectName) continue;
    try {
      const response = await fetch(
        `https://hackatime.hackclub.com/api/v1/users/${cleanedSlackId}/heartbeats/spans?project=${encodeURIComponent(cleanedProjectName)}`,
        { headers: { 'Accept': 'application/json' } }
      );
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.spans)) {
          allSpans = allSpans.concat(data.spans);
        }
      }
    } catch (err) {
      // Ignore errors for individual projects
    }
  }
  // Sort allSpans by end_time
  allSpans.sort((a, b) => a.end_time - b.end_time);

  // 3. Fetch all posts for this user/app
  const posts = await base("Posts")
    .select({
      filterByFormula: `AND({slackId} = '${cleanedSlackId}', {appName} = '${cleanedAppName}')`
    })
    .all();
  // 4. Fetch all ships for this user/app
  // Need to get user's email
  const neighbors = await base("Neighbors")
    .select({
      filterByFormula: `{Slack ID (from slackNeighbor)} = '${cleanedSlackId}'`,
      maxRecords: 1,
    })
    .all();
  let ships = [];
  if (neighbors.length > 0) {
    const email = neighbors[0].fields.Email || neighbors[0].fields.email;
    const cleanedEmail = cleanString(email);
    if (email) {
      ships = await base("ShipLog")
        .select({
          filterByFormula: `AND({Email} = '${cleanedEmail}', {App Name} = '${cleanedAppName}')`
        })
        .all();
    }
  }
  // 5. Merge posts and ships by createdAt
  const timeline = [
    ...posts.map(post => ({ createdAt: post.fields.createdAt })),
    ...ships.map(ship => ({ createdAt: ship.fields["Created At"] }))
  ].filter(item => item.createdAt).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  // 6. Find the last createdAt
  const lastTimelineEnd = timeline.length > 0 ? new Date(timeline[timeline.length - 1].createdAt).getTime() / 1000 : -Infinity;
  // 7. Sum durations of spans that end after lastTimelineEnd
  let unpostedTime = 0;
  allSpans.forEach(span => {
    if (span.end_time > lastTimelineEnd) {
      unpostedTime += span.duration || 0;
    }
  });
  return {
    unloggedSeconds: unpostedTime,
    unloggedHours: (unpostedTime / 3600).toFixed(2),
    lastPostOrShip: lastTimelineEnd === -Infinity ? null : new Date(lastTimelineEnd * 1000).toISOString(),
    totalSpans: allSpans.length,
    totalPosts: posts.length,
    totalShips: ships.length
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { slackId, appName } = req.query;

  if (!slackId) {
    return res.status(400).json({ message: "Missing slackId" });
  }

  try {
    if (appName) {
      // Single app mode (original behavior)
      const result = await getUnloggedTimeForApp(slackId, appName);
      return res.status(200).json(result);
    } else {
      // Multi-app mode: get all apps for this user
      // 1. Lookup neighbor by Slack ID
      console.log("Multi-app mode: Looking up neighbor for slackId:", slackId);
      const cleanedSlackId = cleanString(slackId);
      const neighborRecords = await base("Neighbors")
        .select({
          filterByFormula: `{Slack ID (from slackNeighbor)} = '${cleanedSlackId}'`,
          maxRecords: 1
        })
        .firstPage();
      if (neighborRecords.length === 0) {
        console.log("Multi-app mode: Neighbor not found for slackId:", slackId);
        return res.status(404).json({ message: "Neighbor not found" });
      }
      const neighbor = neighborRecords[0];
      const neighborId = neighbor.id;
      console.log("Multi-app mode: Found neighbor with ID:", neighborId);
      // 2. Get all apps
      console.log("Multi-app mode: Fetching all apps");
      const allApps = await base("Apps")
        .select({
          fields: ["Name", "Neighbors"]
        })
        .all();
      console.log("Multi-app mode: Fetched", allApps.length, "apps");
      // 3. Filter apps that the neighbor is a member of
      const userApps = allApps.filter(app => {
        const neighbors = app.fields.Neighbors || [];
        return neighbors.includes(neighborId);
      });
      console.log("Multi-app mode: Filtered to", userApps.length, "apps for this user");
      // 4. For each app, get unlogged time
      const results = {};
      for (const app of userApps) {
        const name = app.fields.Name;
        if (!name) continue;
        console.log("Multi-app mode: Calculating unlogged time for app:", name);
        results[name] = await getUnloggedTimeForApp(slackId, name);
      }
      return res.status(200).json({ apps: results });
    }
  } catch (error) {
    console.error("Error fetching unlogged time for user/app(s):", error);
    return res.status(500).json({ message: "Error fetching unlogged time for user/app(s)" });
  }
} 