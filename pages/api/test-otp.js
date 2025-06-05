export default async function handler(req, res) {
  try {
    // Try GET request
    console.log('Trying GET request...');
    const getResponse = await fetch('https://neighborhood.hackclub.com/api/sendOtp', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    console.log('GET Response status:', getResponse.status);
    console.log('GET Response headers:', Object.fromEntries(getResponse.headers.entries()));

    // Try POST request with different content types
    console.log('\nTrying POST request with application/json...');
    const postResponse = await fetch('https://neighborhood.hackclub.com/api/sendOtp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ email: 'test@example.com' })
    });
    console.log('POST Response status:', postResponse.status);
    console.log('POST Response headers:', Object.fromEntries(postResponse.headers.entries()));

    // Try POST request with form data
    console.log('\nTrying POST request with form data...');
    const formData = new URLSearchParams();
    formData.append('email', 'test@example.com');
    const formResponse = await fetch('https://neighborhood.hackclub.com/api/sendOtp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: formData
    });
    console.log('Form POST Response status:', formResponse.status);
    console.log('Form POST Response headers:', Object.fromEntries(formResponse.headers.entries()));

    return res.status(200).json({ message: 'Test completed' });
  } catch (error) {
    console.error('Test error:', error);
    return res.status(500).json({ message: error.message });
  }
} 
 
 
 
 
 
 
 