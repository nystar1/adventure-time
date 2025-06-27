import Airtable from "airtable";

const base = new Airtable({
  apiKey: process.env.NEIGHBORHOOD_AIRTABLE_API_KEY,
}).base(process.env.NEIGHBORHOOD_AIRTABLE_BASE_ID);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { email1, email2 } = req.body;

  if (!email1 || !email2) {
    return res.status(400).json({ message: "Both emails are required" });
  }

  try {
    // Find neighbors by email
    const findNeighbor = async (email) => {
      const records = await base("Neighbors")
        .select({
          filterByFormula: `{Email} = '${email}'`,
          maxRecords: 1
        })
        .firstPage();
      
      if (records.length === 0) {
        return null;
      }
      
      return records[0];
    };

    const neighbor1 = await findNeighbor(email1);
    const neighbor2 = await findNeighbor(email2);

    if (!neighbor1) {
      return res.status(404).json({ message: `User with email ${email1} not found` });
    }

    if (!neighbor2) {
      return res.status(404).json({ message: `User with email ${email2} not found` });
    }

    // Update both neighbors to set isDoingFreedomWeek to true
    const updateResults = await Promise.all([
      base("Neighbors").update(neighbor1.id, {
        isDoingFreedomWeek: true
      }),
      base("Neighbors").update(neighbor2.id, {
        isDoingFreedomWeek: true
      })
    ]);

    return res.status(200).json({ 
      success: true, 
      message: "Both users have been enrolled in Freedom Week",
      users: [
        {
          id: updateResults[0].id,
          name: updateResults[0].fields["Full Name"] || updateResults[0].fields["Full Name (from slackNeighbor)"] || null,
          email: email1
        },
        {
          id: updateResults[1].id,
          name: updateResults[1].fields["Full Name"] || updateResults[1].fields["Full Name (from slackNeighbor)"] || null,
          email: email2
        }
      ]
    });
  } catch (error) {
    console.error("Error joining Freedom Week:", error);
    return res.status(500).json({ message: "Error joining Freedom Week", error: error.message });
  }
} 