export default function handler(req, res) {
  // Only show first 10 characters of sensitive values for security
  const apiKey = process.env.NEIGHBORHOOD_AIRTABLE_API_KEY_FIXED || 'not set';
  const maskedKey = apiKey ? apiKey.substring(0, 10) + '...' : 'undefined';
  
  res.status(200).json({ 
    apiKeyFirstChars: maskedKey,
    apiKeyLength: apiKey ? apiKey.length : 0
  });
} 