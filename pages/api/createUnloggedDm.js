import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.NEIGHBORHOOD_AIRTABLE_API_KEY }).base(
  process.env.NEIGHBORHOOD_AIRTABLE_BASE_ID
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { slackID, unloggedTime, projectName } = req.body;

  if (!slackID || unloggedTime === undefined || !projectName) {
    return res.status(400).json({ message: "Missing slackID, unloggedTime, or projectName" });
  }

  try {
    const created = await base("DMUser").create({
      slackID,
      unloggedTime: Number(unloggedTime),
      projectName
    });
    return res.status(200).json({ record: created });
  } catch (error) {
    console.error("Error creating DMUser record:", error);
    return res.status(500).json({ message: "Error creating DMUser record", error: error.message });
  }
} 