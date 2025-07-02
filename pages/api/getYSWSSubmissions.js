import Airtable from "airtable";

const base = new Airtable({
  apiKey: process.env.NEIGHBORHOOD_AIRTABLE_API_KEY_FIXED,
}).base(process.env.NEIGHBORHOOD_AIRTABLE_BASE_ID);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const records = await base("YSWS Project Submission")
      .select({
        fields: [
          "Code URL",
          "Playable URL",
          "Automation - Status",
          "First Name",
          "Last Name",
          "Screenshot",
          "Description",
          "GitHub Username",
          "Pfp",
          "slackHandle",
          "totalTimeHackatimeHours (from neighbors)"
        ]
      })
      .all();

    const submissions = records.map(record => ({
      id: record.id,
      codeUrl: record.fields["Code URL"] || "",
      playableUrl: record.fields["Playable URL"] || "",
      status: record.fields["Automation - Status"] || "",
      firstName: record.fields["First Name"] || "",
      lastName: record.fields["Last Name"] || "",
      screenshot: record.fields["Screenshot"] ? record.fields["Screenshot"][0].url : null,
      description: record.fields["Description"] || "",
      githubUsername: record.fields["GitHub Username"] || "",
      slackId: record.fields["slackHandle"] || "",
      Pfp: record.fields["Pfp"] || "",
      totalTimeHackatimeHours: record.fields["totalTimeHackatimeHours (from neighbors)"] || 0
    }));

    return res.status(200).json({ submissions });
  } catch (error) {
    console.error("Error fetching YSWS submissions:", error);
    return res.status(500).json({ message: "Error fetching YSWS submissions", error: error.message });
  }
} 