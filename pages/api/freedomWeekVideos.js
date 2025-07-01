import Airtable from "airtable";

const base = new Airtable({
  apiKey: process.env.NEIGHBORHOOD_AIRTABLE_API_KEY,
}).base(process.env.NEIGHBORHOOD_AIRTABLE_BASE_ID);

let cachedResponse = null;
let cacheTimestamp = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; 

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  if (cachedResponse && (Date.now() - cacheTimestamp < CACHE_DURATION_MS)) {
    return res.status(200).json(cachedResponse);
  }

  try {
    const freedomVideos = await base("Freedom week videos")
      .select({
        fields: ["ID", "Emails", "Video"],
        sort: [{ field: "ID", direction: "asc" }]
      })
      .all();

    const neighbors = await base("neighbors")
      .select({
        fields: ["email", "Full Name"]
      })
      .all();

    const emailToNameMap = {};
    neighbors.forEach(neighbor => {
      const email = neighbor.fields["email"];
      const fullName = neighbor.fields["Full Name"];
      if (email && fullName && typeof email === 'string') {
        const cleanEmail = email.trim().toLowerCase();
        emailToNameMap[cleanEmail] = fullName;
      }
    });

    const processedVideos = freedomVideos.map(video => {
      const emails = video.fields.Emails ? video.fields.Emails.split(';').map(e => e.trim()) : [];
      console.log('Processing video ID:', video.fields.ID, 'emails:', emails);
      const participantNames = emails.map(email => {
        if (typeof email === 'string') {
          const cleanEmail = email.trim().toLowerCase();
          const fullName = emailToNameMap[cleanEmail];
          console.log('Email:', email, 'Cleaned:', cleanEmail, 'Full Name:', fullName);
          return fullName || email; 
        }
        return email;
      });
      console.log('Final participantNames:', participantNames);
      return {
        id: video.fields.ID,
        recordId: video.id,
        participants: participantNames,
        videoUrl: video.fields.Video || null
      };
    });

    const responseData = {
      success: true,
      videos: processedVideos
    };
    cachedResponse = responseData;
    cacheTimestamp = Date.now();

    return res.status(200).json(responseData);

  } catch (error) {
    console.error("Freedom week videos fetch error:", error);
    return res.status(500).json({ 
      message: "Failed to fetch freedom week videos", 
      error: error.message 
    });
  }
}
