import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.NEIGHBORHOOD_AIRTABLE_API_KEY_FIXED }).base(
  process.env.NEIGHBORHOOD_AIRTABLE_BASE_ID
);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { slackId, appName } = req.query;

  if (!slackId || !appName) {
    return res.status(400).json({ message: "Missing slackId or appName" });
  }

  try {
    const posts = await base("Posts")
      .select({
        filterByFormula: `AND({slackId} = '${slackId}', {appName} = '${appName}')`
      })
      .all();

    const formatted = posts.map(post => ({
      id: post.id,
      title: post.fields.title || null,
      content: post.fields.description || null,
      createdAt: post.fields.createdAt || null,
      slackId: post.fields.slackId || null,
      appName: post.fields.appName || null,
      photoboothVideo: post.fields.photoboothVideo || null,
      demoVideo: post.fields.demoVideo || null,
      approved_time_hours: post.fields.approved_time_hours || null,
      review_comment: post.fields.review_comment || null,
      review_status: post.fields.review_status || null
    }));

    return res.status(200).json({ posts: formatted });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return res.status(500).json({ message: "Error fetching posts" });
  }
} 