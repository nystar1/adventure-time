export default async function handler(req, res) {
  const { slackId, project } = req.query;

  if (!slackId || !project) {
    return res.status(400).json({ error: 'Missing slackId or project' });
  }

  try {
    const response = await fetch(
      `https://hackatime.hackclub.com/api/v1/users/${slackId}/heartbeats/spans?project=${encodeURIComponent(project)}`,
      {
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Hackatime API responded with status: ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching Hackatime project data:', error);
    res.status(500).json({ error: 'Failed to fetch Hackatime project data' });
  }
} 