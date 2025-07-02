import Airtable from "airtable";

const base = new Airtable({
  apiKey: process.env.NEIGHBORHOOD_AIRTABLE_API_KEY_FIXED,
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
          "totalTimeHackatimeHours",
          "yswsProjectSubmittedAt",
          "hideJakeTheDog",
          "isIRL"
        ]
      })
      .all();
    const neighbors = neighborRecords.map(record => ({
      id: record.id,
      slackId: record.fields["Slack ID (from slackNeighbor)"] || null,
      fullName: record.fields["Full Name (from slackNeighbor)"] || null,
      appIds: record.fields["Apps"] || [],
      totalTimeHackatimeHours: record.fields["totalTimeHackatimeHours"] || 0,
      yswsProjectSubmittedAt: record.fields["yswsProjectSubmittedAt"] || null,
      hideJakeTheDog: record.fields["hideJakeTheDog"] || false,
      isIRL: record.fields["isIRL"] || false
    }));
    console.log(`Fetched ${neighbors.length} neighbors.`);

    // Only assign to users with >1 hour logged in hackatime and who haven't opted out
    const eligibleReviewers = neighbors.filter(n => 
      n.totalTimeHackatimeHours > 1 && 
      !n.hideJakeTheDog
    );
    console.log(`Filtered to ${eligibleReviewers.length} eligible reviewers with >1hr logged and not opted out.`);

    console.log('Fetching all apps...');
    const appRecords = await base("Apps")
      .select({
        fields: [
          "Name", 
          "Neighbors", 
          "playableURL", 
          "YSWS Project Submission–Status"
        ]
      })
      .all();
    const apps = appRecords.map(record => ({
      id: record.id,
      name: record.fields["Name"] || null,
      neighborIds: record.fields["Neighbors"] || [],
      playableURL: record.fields["playableURL"] || null,
      yswsSubmissionStatus: record.fields["YSWS Project Submission–Status"] || null
    }));
    console.log(`Fetched ${apps.length} apps.`);

    // Filter apps to only include those with playableURL and YSWS submission status
    const eligibleApps = apps.filter(app => 
      app.playableURL && 
      app.yswsSubmissionStatus
    );
    console.log(`Filtered to ${eligibleApps.length} eligible apps with playableURL and YSWS submission status.`);

    // Identify apps from IRL neighbors
    const irlNeighborIds = neighbors.filter(n => n.isIRL).map(n => n.id);
    console.log(`Found ${irlNeighborIds.length} IRL neighbors.`);
    
    const irlApps = eligibleApps.filter(app => 
      app.neighborIds.some(neighborId => irlNeighborIds.includes(neighborId))
    );
    console.log(`Found ${irlApps.length} apps from IRL neighbors.`);

    const created = [];
    for (const reviewer of eligibleReviewers) {
      console.log(`\nProcessing reviewer: ${reviewer.fullName || reviewer.slackId} (${reviewer.id})`);
      
      // First prioritize apps from IRL neighbors, then fallback to any eligible app
      let priorityApps = irlApps;
      let fallbackApps = eligibleApps.filter(app => !irlApps.includes(app));
      
      // Build a pool of all qualifying (app, owner) pairs not by this reviewer
      const pool = [];
      
      // Process priority apps first (IRL neighbors' apps)
      for (const app of priorityApps) {
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
          return owner.totalTimeHackatimeHours > 50 && 
                 owner.yswsProjectSubmittedAt && 
                 owner.yswsProjectSubmittedAt !== "" && 
                 !owner.hideJakeTheDog;
        });
        if (eligibleOwners.length === 0) {
          console.log(`  Skipping app '${app.name}' (no owners with >50hr or missing project submission or opted out)`);
          continue;
        }
        // Pick a random eligible owner
        const ownerId = eligibleOwners[Math.floor(Math.random() * eligibleOwners.length)];
        pool.push({
          reviewerId: reviewer.id,
          reviewedNeighborId: ownerId,
          reviewedAppId: app.id,
          appName: app.name,
          isIRLApp: true
        });
        console.log(`    Added to pool (IRL): reviewer=${reviewer.fullName || reviewer.slackId} app='${app.name}' ownerId=${ownerId}`);
      }
      
      // If we don't have enough IRL apps, add non-IRL apps as fallback
      if (pool.length < 5) {
        for (const app of fallbackApps) {
          // Exclude apps the reviewer is a member of
          if (app.neighborIds.includes(reviewer.id)) {
            continue;
          }
          // Only consider apps with at least one member (owner)
          const possibleOwners = app.neighborIds.filter(ownerId => ownerId !== reviewer.id);
          if (possibleOwners.length === 0) {
            continue;
          }
          // Filter owners to those with >50 hours
          const eligibleOwners = possibleOwners.filter(ownerId => {
            const owner = neighbors.find(n => n.id === ownerId);
            if (!owner) return false;
            return owner.totalTimeHackatimeHours > 50 && 
                   owner.yswsProjectSubmittedAt && 
                   owner.yswsProjectSubmittedAt !== "" && 
                   !owner.hideJakeTheDog;
          });
          if (eligibleOwners.length === 0) {
            continue;
          }
          // Pick a random eligible owner
          const ownerId = eligibleOwners[Math.floor(Math.random() * eligibleOwners.length)];
          pool.push({
            reviewerId: reviewer.id,
            reviewedNeighborId: ownerId,
            reviewedAppId: app.id,
            appName: app.name,
            isIRLApp: false
          });
          console.log(`    Added to pool (non-IRL fallback): reviewer=${reviewer.fullName || reviewer.slackId} app='${app.name}' ownerId=${ownerId}`);
        }
      }
      
      // Shuffle pool
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      
      // Sort the pool to prioritize IRL apps
      pool.sort((a, b) => (b.isIRLApp ? 1 : 0) - (a.isIRLApp ? 1 : 0));
      
      // Assign up to 5 unique (owner/app) pairs
      const seen = new Set();
      let count = 0;
      for (const item of pool) {
        const key = item.reviewedNeighborId + '|' + item.reviewedAppId;
        if (!seen.has(key)) {
          try {
            console.log(`  Creating ReviewAssignment: reviewer=${item.reviewerId}, reviewedNeighbor=${item.reviewedNeighborId}, app='${item.appName}' (${item.reviewedAppId}), isIRLApp=${item.isIRLApp}`);
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
    res.status(200).json({ 
      message: 'Random projects assigned successfully', 
      created: created.length,
      reviewers: eligibleReviewers.length,
      apps: eligibleApps.length,
      irlApps: irlApps.length
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'An error occurred' });
  }
}