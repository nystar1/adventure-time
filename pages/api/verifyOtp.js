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
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Failed to verify OTP' });
  }
} 
    // Check if response is ok before trying to parse JSON
    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = 'Invalid OTP';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // If response isn't JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    // Try to parse JSON response
    let data;
    try {
      data = await response.json();
    } catch (e) {
      // If response isn't JSON but request was successful, return success
      return res.status(200).json({ message: 'OTP verified successfully' });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return res.status(500).json({ message: error.message || 'Failed to verify OTP' });
  }
} 