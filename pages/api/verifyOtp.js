import Airtable from "airtable";
import crypto from 'crypto';

const base = new Airtable({
  apiKey: process.env.NEIGHBORHOOD_AIRTABLE_API_KEY,
}).base(process.env.NEIGHBORHOOD_AIRTABLE_BASE_ID);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const requestBody = JSON.stringify({ 
      email: req.body.email,
      otp: req.body.otp
    });
    console.log('Request body:', requestBody);
    
    const response = await fetch('https://neighborhood.hackclub.com/api/verifyOTP', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestBody,
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return res.status(500).json({ message: error.message || 'Failed to verify OTP' });
  }
} 