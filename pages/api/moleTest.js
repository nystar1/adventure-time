import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.Mole_Airtable_Token || process.env.MOLE_AIRTABLE_TOKEN }).base("appJoAAl0y0Pr2itM");

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { record_id } = req.query;
  if (!record_id) {
    return res.status(400).json({ message: "Missing record_id" });
  }

  try {
    const record = await base("checks").find(record_id);
    return res.status(200).json({
      record_id: record.id,
      fields: record.fields
    });
  } catch (error) {
    console.error("Error fetching record:", error);
    return res.status(500).json({ message: "Error fetching record" });
  }
} 