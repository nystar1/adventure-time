import Airtable from "airtable";

const base = new Airtable({
  apiKey: process.env.NEIGHBORHOOD_AIRTABLE_API_KEY,
}).base(process.env.NEIGHBORHOOD_AIRTABLE_BASE_ID);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Fetching all neighbors...');
    const neighborRecords = await base("Neighbors")
      .select({
        fields: [
          "Slack ID (from slackNeighbor)",
          "Full Name (from slackNeighbor)",
          "Apps",
          "totalTimeHackatimeHours"
        ]
      })
      .all();
    const neighbors = neighborRecords.map(record => ({
      id: record.id,
      slackId: record.fields["Slack ID (from slackNeighbor)"] || null,
      fullName: record.fields["Full Name (from slackNeighbor)"] || null,
      appIds: record.fields["Apps"] || [],
      totalTimeHackatimeHours: record.fields["totalTimeHackatimeHours"] || 0
    }));
    console.log(`Fetched ${neighbors.length} neighbors.`);

    // Only assign to users with >1 hour logged in hackatime
    const eligibleReviewers = neighbors.filter(n => n.totalTimeHackatimeHours > 1);
    console.log(`Filtered to ${eligibleReviewers.length} eligible reviewers with >1hr logged.`);

    console.log('Fetching all apps...');
    const appRecords = await base("Apps")
      .select({
        fields: ["Name", "Neighbors"]
      })
      .all();
    const apps = appRecords.map(record => ({
      id: record.id,
      name: record.fields["Name"] || null,
      neighborIds: record.fields["Neighbors"] || []
    }));
    console.log(`Fetched ${apps.length} apps.`);

    const created = [];
    for (const reviewer of eligibleReviewers) {
      console.log(`\nProcessing reviewer: ${reviewer.fullName || reviewer.slackId} (${reviewer.id})`);
      // Build a pool of all qualifying (app, owner) pairs not by this reviewer
      const pool = [];
      for (const app of apps) {
        // Exclude apps the reviewer is a member of
        if (app.neighborIds.includes(reviewer.id)) {
          console.log(`  Skipping app '${app.name}' for reviewer (is a member)`);
          continue;
        }
        // Only consider apps with at least one member (owner)
        const possibleOwners = app.neighborIds.filter(ownerId => ownerId !== reviewer.id);
        if (possibleOwners.length === 0) {
          console.log(`  Skipping app '${app.name}' (no eligible owners)`);
          continue;
        }
        // Filter owners to those with >50 hours
        const eligibleOwners = possibleOwners.filter(ownerId => {
          const owner = neighbors.find(n => n.id === ownerId);
          if (!owner) return false;
          console.log(`    Considering owner ${owner.fullName || owner.slackId} (${owner.id}) with ${owner.totalTimeHackatimeHours}hr`);
          return owner.totalTimeHackatimeHours > 50;
        });
        if (eligibleOwners.length === 0) {
          console.log(`  Skipping app '${app.name}' (no owners with >50hr)`);
          continue;
        }
        // Pick a random eligible owner
        const ownerId = eligibleOwners[Math.floor(Math.random() * eligibleOwners.length)];
        pool.push({
          reviewerId: reviewer.id,
          reviewedNeighborId: ownerId,
          reviewedAppId: app.id,
          appName: app.name
        });
        console.log(`    Added to pool: reviewer=${reviewer.fullName || reviewer.slackId} app='${app.name}' ownerId=${ownerId}`);
      }
      // Shuffle pool
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      // Assign up to 5 unique (owner/app) pairs
      const seen = new Set();
      let count = 0;
      for (const item of pool) {
        const key = item.reviewedNeighborId + '|' + item.reviewedAppId;
        if (!seen.has(key)) {
          try {
            console.log(`  Creating ReviewAssignment: reviewer=${item.reviewerId}, reviewedNeighbor=${item.reviewedNeighborId}, app='${item.appName}' (${item.reviewedAppId})`);
            const record = await base('ReviewAssignment').create({
              reviewer: [item.reviewerId],
              reviewedNeighbor: [item.reviewedNeighborId],
              reviewedApp: [item.reviewedAppId]
            });
            created.push(record.getId());
            seen.add(key);
            count++;
            console.log(`    Created ReviewAssignment record: ${record.getId()}`);
            // Wait 1ms before creating the next record (adjust as needed)
            await new Promise(res => setTimeout(res, 1));
          } catch (err) {
            console.error(`    Error creating ReviewAssignment for reviewer=${item.reviewerId}, reviewedNeighbor=${item.reviewedNeighborId}, app=${item.reviewedAppId}:`, err);
          }
        } else {
          console.log(`  Skipping duplicate assignment for owner/app pair: ${key}`);
        }
        if (count >= 5) {
          console.log(`  Assigned 5 apps to reviewer ${reviewer.fullName || reviewer.slackId}`);
          break;
        }
      }
      if (count === 0) {
        console.log(`  No qualifying assignments for reviewer ${reviewer.fullName || reviewer.slackId}`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'An error occurred' });
  }
}