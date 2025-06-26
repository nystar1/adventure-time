import Airtable from "airtable";

const base = new Airtable({
  apiKey: process.env.NEIGHBORHOOD_AIRTABLE_API_KEY,
}).base(process.env.NEIGHBORHOOD_AIRTABLE_BASE_ID);

// Helper function to fetch all pages of records
async function getAllRecords(query) {
  let allRecords = [];
  await query.eachPage((records, fetchNextPage) => {
    allRecords = [...allRecords, ...records];
    fetchNextPage();
  });
  return allRecords;
}

export default async function handler(req, res) {
  try {
    console.log('Fetching houses from Houses table...');
    // Fetch houses from the Houses table
    const houseRecords = await getAllRecords(
      base('Houses').select({
        fields: ['Name', 'Thumbnail', 'stays', 'capacity']
      })
    );
    
    console.log(`Found ${houseRecords.length} houses`);
    
    // Get all unique stay IDs from houses
    const stayIds = new Set();
    houseRecords.forEach(house => {
      const stays = house.fields.stays || [];
      console.log(`House "${house.fields.Name}" has ${stays.length} stays:`, stays);
      stays.forEach(stayId => stayIds.add(stayId));
    });
    
    console.log(`Total unique stay IDs: ${stayIds.size}`);
    
    // If there are stays, fetch their details
    let staysById = {};
    if (stayIds.size > 0) {
      console.log('Fetching stay details from "stay" table...');
      try {
        const filterFormula = `OR(${Array.from(stayIds).map(id => `RECORD_ID()='${id}'`).join(',')})`;
        console.log('Filter formula:', filterFormula);
        
        const stayRecords = await getAllRecords(
          base('stay').select({
            filterByFormula: filterFormula,
            fields: [
              'start_date',
              'end_date',
              'Pfp',
              'handle',
              'fullName',
              'is_here',
              'bookingStatus',
              'hasFlight',
              'approvedForStipend',
              'totalTimeHackatimeHours'
            ]
          })
        );
        
        console.log(`Found ${stayRecords.length} stay records`);
        
        // Create a map of stay IDs to stay details
        staysById = stayRecords.reduce((acc, stay) => {
          console.log(`Processing stay ID: ${stay.id}, fields:`, stay.fields);
          acc[stay.id] = {
            id: stay.id,
            start_date: stay.fields.start_date || null,
            end_date: stay.fields.end_date || null,
            pfp: stay.fields.Pfp || null,
            handle: stay.fields.handle || '',
            fullName: stay.fields.fullName || '',
            is_here: stay.fields.is_here || false,
            bookingStatus: stay.fields.bookingStatus || '',
            hasFlight: stay.fields.hasFlight || false,
            approvedForStipend: stay.fields.approvedForStipend || false,
            totalTimeHackatimeHours: stay.fields.totalTimeHackatimeHours || 0
          };
          return acc;
        }, {});
      } catch (stayError) {
        console.error('Error fetching stays:', stayError);
        // Continue execution to at least return houses without stays
      }
    }
    
    // Format the response with houses and their stays
    const houses = houseRecords.map(record => {
      const stayIds = record.fields.stays || [];
      const houseStays = stayIds.map(id => staysById[id]).filter(Boolean);
      
      return {
        id: record.id,
        name: record.fields.Name || '',
        thumbnail: record.fields.Thumbnail || null,
        capacity: record.fields.capacity || null,
        stays: houseStays
      };
    });
    
    console.log('Sending response with houses and stays');
    res.status(200).json({ houses });
  } catch (error) {
    console.error('Error fetching houses and stays:', error);
    // Add more detailed error information
    const errorDetails = {
      message: 'Failed to fetch houses and stays',
      error: error.message,
      statusCode: error.statusCode,
      errorType: error.error
    };
    res.status(500).json(errorDetails);
  }
} 