import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.Mole_Airtable_Token || process.env.MOLE_AIRTABLE_TOKEN }).base("appJoAAl0y0Pr2itM");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { appLink, githubUrl } = req.body;
  if (!appLink || !githubUrl) {
    return res.status(400).json({ message: "Missing appLink, githubUrl" });
  }

  try {
    // Check if a record with the same play_url and repo_url exists and is not complete
    const existingRecords = await base("checks")
      .select({
        filterByFormula: `AND({play_url} = '${appLink}', {repo_url} = '${githubUrl}')`,
        maxRecords: 5
      })
      .all();
    const cued = existingRecords.find(
      rec => rec.fields && (rec.fields.ai_guess === undefined || rec.fields.ai_guess === null)
    );
    if (cued) {
      return res.status(200).json({ record_id: cued.id, already_cued: true });
    }
    const created = await base("checks").create({
      play_url: appLink,
      repo_url: githubUrl,
      readme_url: ""
    });
    return res.status(200).json({ record_id: created.getId() });
  } catch (error) {
    console.error("Error creating record:", error);
    return res.status(500).json({ message: "Error creating record" });
  }
} 