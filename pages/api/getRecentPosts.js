import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.NEIGHBORHOOD_AIRTABLE_API_KEY_FIXED }).base(
  process.env.NEIGHBORHOOD_AIRTABLE_BASE_ID
);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    const posts = await base("Posts")
      .select({
        fields: [
          "description",
          "createdAt",
          "slackId",
          "appName",
          "photoboothVideo",
          "demoVideo",
          "approved_time_hours",
          "review_comment",
          "review_status"
        ],
        sort: [{ field: "createdAt", direction: "desc" }],
        maxRecords: parseInt(limit),
        offset: offset
      })
      .all();

    const formatted = posts.map(post => ({
      id: post.id,
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