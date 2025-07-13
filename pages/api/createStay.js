import { cleanString } from "../../lib/airtable";
import Airtable from "airtable";

const base = new Airtable({
  apiKey: process.env.NEIGHBORHOOD_AIRTABLE_API_KEY_FIXED,
}).base(process.env.NEIGHBORHOOD_AIRTABLE_BASE_ID);

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { token, houseId, arrivalDate, exitDate, hasFlight } = req.body;

  if (!token) {
    return res.status(400).json({ message: 'Missing token' });
  }

  if (!houseId || !arrivalDate || !exitDate) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    console.log('Processing stay request with data:', { houseId, arrivalDate, exitDate, hasFlight });
    
    // First, find the neighbor with this token
    const neighborRecords = await base('Neighbors').select({
      filterByFormula: `{token} = '${cleanString(token)}'`,
      maxRecords: 1
    }).firstPage();
    
    if (!neighborRecords.length) {
      return res.status(404).json({ message: 'Neighbor not found' });
    }
    
    const neighbor = neighborRecords[0];
    const neighborId = neighbor.id;
    const slackId = neighbor.fields["Slack ID (from slackNeighbor)"] || null;
    
    if (!slackId) {
      return res.status(400).json({ message: 'Neighbor does not have a SlackId' });
    }
    
    console.log(`Found neighbor: ${neighbor.fields.Name || ''} (${neighborId}) with SlackId: ${slackId}`);

    // Check if there's already a stay with this SlackId
    const existingStayRecords = await base('stay').select({
      filterByFormula: `{SlackId} = '${cleanString(slackId)}'`,
      maxRecords: 1
    }).firstPage();
    
    let stayRecord;
    let actionTaken;
    
    if (existingStayRecords.length > 0) {
      // Update the existing stay
      const existingStay = existingStayRecords[0];
      console.log(`Found existing stay with SlackId ${slackId}: ${existingStay.id}, updating it`);
      
      stayRecord = await base('stay').update(existingStay.id, {
        start_date: arrivalDate,
        end_date: exitDate,
        hasFlight: hasFlight,
        bookingStatus: 'Pending', // Reset to pending on update
        house: [houseId]
        // SlackId and neighbor stay the same
      });
      
      actionTaken = 'updated';
    } else {
      // Create a new stay record
      console.log(`No existing stay found for SlackId ${slackId}, creating new one`);
      
      stayRecord = await base('stay').create({
        start_date: arrivalDate,
        end_date: exitDate,
        hasFlight: hasFlight,
        bookingStatus: 'Pending',
        house: [houseId],
        neighbor: [neighborId],
      });
      
      actionTaken = 'created';
    }
    
    console.log(`Stay record ${actionTaken}: ${stayRecord.id}`);

    res.status(201).json({ 
      success: true, 
      stayId: stayRecord.id,
      action: actionTaken,
      message: `Stay request ${actionTaken} successfully` 
    });
  } catch (error) {
    console.error('Error processing stay request:', error);
    res.status(500).json({ 
      message: 'Failed to process stay request',
      error: error.message,
      statusCode: error.statusCode,
      errorType: error.error
    });
  }
} 