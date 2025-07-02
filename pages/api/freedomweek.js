import Airtable from "airtable";

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

const base = new Airtable({
  apiKey: process.env.NEIGHBORHOOD_AIRTABLE_API_KEY,
}).base(process.env.NEIGHBORHOOD_AIRTABLE_BASE_ID);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const today = new Date();
  const isJuly5th = today.getMonth() === 6 && today.getDate() === 5; 
  
  if (!isJuly5th) {
    return res.status(403).json({ 
      message: "This endpoint is only available on July 5th. Please try again on the correct date." 
    });
  }

  try {
    const body = await getJsonBody(req);
    const { action, emails, recordId, videoUrl, email } = body;

    if (!action) {
      return res.status(400).json({ message: "Missing action type" });
    }

    if (action === "create") {
      if (!emails || !Array.isArray(emails) || emails.length !== 2) {
        return res.status(400).json({ message: "Exactly 2 participant emails are required." });
      }

      const existing = await base("Freedom week videos")
        .select({ sort: [{ field: "ID", direction: "desc" }], maxRecords: 1 })
        .firstPage();

      let nextId = "1";
      if (existing.length > 0 && existing[0].fields["ID"]) {
        const lastId = parseInt(existing[0].fields["ID"]);
        if (!isNaN(lastId)) {
          nextId = (lastId + 1).toString();
        }
      }

      try {
        const created = await base("Freedom week videos").create({
          ID: nextId,
          Emails: `${emails[0]}; ${emails[1]}`,
        });
        return res.status(200).json({
          success: true,
          record: { id: created.id, emails: created.fields.Emails, recordID: created.fields.ID },
        });
      } catch (airtableError) {
        console.error("Airtable create error:", airtableError);
        return res.status(500).json({ message: "Failed to create record in Airtable", error: airtableError.message });
      }
    }

    if (action === "findRecordByEmail") {
      if (!email) {
        return res.status(400).json({ message: "Missing email" });
      }
      try {
        const found = await base("Freedom week videos")
          .select({ filterByFormula: `FIND('${email}', {Emails}) > 0`, maxRecords: 1 })
          .firstPage();
        if (found.length === 0) {
          return res.status(404).json({ message: "Record not found for this email" });
        }
        return res.status(200).json({ success: true, recordId: found[0].id, emails: found[0].fields.Emails });
      } catch (err) {
        console.error("Airtable find error:", err);
        return res.status(500).json({ message: "Failed to find record", error: err.message });
      }
    }

    if (action === "saveVideoUrl") {
      if (!recordId || !videoUrl) {
        return res.status(400).json({ message: "Missing recordId or videoUrl" });
      }
      try {
        await base("Freedom week videos").update(recordId, {
          Video: videoUrl,
        });
        return res.status(200).json({ success: true });
      } catch (err) {
        console.error("Airtable update error:", err);
        return res.status(500).json({ message: "Failed to save video URL", error: err.message });
      }
    }

    return res.status(400).json({ message: "Invalid or unsupported action" });
  } catch (error) {
    console.error("Handler error:", error);
    return res.status(500).json({ message: error.message || "Unexpected error" });
  }
}

async function getJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk.toString()));
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
  });
}
