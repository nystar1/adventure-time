export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch('https://hackatime.hackclub.com/api/hackatime/v1/users/current/heartbeats', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ab030478-0a06-419c-a076-9ee6886d16e0`,
        'User-Agent': 'Adventure Time/1.0',
      },
      body: JSON.stringify({
        entity: req.body.entity,
        type: 'file',
        time: Math.floor(Date.now() / 1000), // Convert to UNIX timestamp
        project: req.body.project,
        language: req.body.language || 'JavaScript',
        is_write: true,
      }),
    });

    const rawResponse = await response.text();
    console.log('Raw Response:', rawResponse);

    try {
      const data = JSON.parse(rawResponse);
      res.status(response.status).json(data);
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      res.status(500).json({ error: 'Error parsing response from Hackatime API' });
    }
  } catch (error) {
    console.error('Error forwarding heartbeat:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
} 