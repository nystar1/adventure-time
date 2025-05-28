import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.Mole_Airtable_Token || process.env.MOLE_AIRTABLE_TOKEN }).base("appJoAAl0y0Pr2itM");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { appLink, githubUrl } = req.body;
  if (!appLink || !githubUrl) {
    return res.status(400).json({ message: "Missing appLink or githubUrl" });
  }

  try {
    // Parse githubUrl to get owner, repo, and branch
    let readme_url = "";
    try {
      const githubMatch = githubUrl.match(/github.com\/(.*?)\/(.*?)(?:\/(tree|blob)\/([^\/]+))?(?:\/|$)/);
      if (githubMatch) {
        const owner = githubMatch[1];
        const repo = githubMatch[2];
        const branch = githubMatch[4] || "main";
        readme_url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`;
      }
    } catch (e) {
      readme_url = githubUrl;
    }
    const created = await base("checks").create({
      play_url: appLink,
      repo_url: githubUrl,
      readme_url
    });
    return res.status(200).json({ record_id: created.getId() });
  } catch (error) {
    console.error("Error creating record:", error);
    return res.status(500).json({ message: "Error creating record" });
  }
} 