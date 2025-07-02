import Airtable from "airtable";

// Get the API key from our utility function
const apiKey = process.env.NEIGHBORHOOD_AIRTABLE_API_KEY_FIXED;

const base = new Airtable({ apiKey }).base(
  process.env.NEIGHBORHOOD_AIRTABLE_BASE_ID
);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // First, get all neighborsx
    const neighborRecords = await base("Neighbors")
      .select({
        fields: [
          "Slack ID (from slackNeighbor)",
          "Full Name (from slackNeighbor)",
          "Full Name",
          "totalTimeHackatimeHours",
          "weightedGrantsContribution",
          "stay",
          "approvedFlightStipend",
          "country"
        ]
      })
      .all();

    // Get all stays to look up confirmed ones
    const stayRecords = await base("stay")
      .select({
        fields: [
          "start_date",
          "end_date",
          "bookingStatus",
          "houseName"
        ]
      })
      .all();

    // Create a map of stays by ID for quick lookup
    const staysById = {};
    stayRecords.forEach(stay => {
      // Handle houseName as an array
      const houseName = stay.fields.houseName && stay.fields.houseName.length > 0 
        ? stay.fields.houseName[0] 
        : "Unknown";
        
      staysById[stay.id] = {
        startDate: stay.fields.start_date,
        endDate: stay.fields.end_date,
        bookingStatus: stay.fields.bookingStatus,
        houseName: houseName
      };
    });

    console.log("Stay records:", stayRecords);
    // Get unique house names
    const uniqueHouseNames = [...new Set(stayRecords
      .filter(stay => stay.fields.houseName && stay.fields.houseName.length > 0)
      .map(stay => stay.fields.houseName[0]))]
      .sort((a, b) => a.localeCompare(b));
    
    console.log("Unique house names:", uniqueHouseNames);

    const neighbors = neighborRecords
      .map(record => {
        // Calculate rent cost and food cost for confirmed stays
        let rentCost = 0;
        let foodCost = 0;
        let startDate = null;
        let endDate = null;
        let houseName = null;
        
        if (record.fields.stay && record.fields.stay.length > 0) {
          // Find the most recent confirmed stay (or any stay if none are confirmed)
          let mostRecentStay = null;
          
          // First try to find a confirmed stay
          for (const stayId of record.fields.stay) {
            const stay = staysById[stayId];
            if (stay && stay.bookingStatus === "Confirmed" && stay.startDate && stay.endDate) {
              if (!mostRecentStay || new Date(stay.startDate) > new Date(mostRecentStay.startDate)) {
                mostRecentStay = stay;
              }
            }
          }
          
          // If no confirmed stay was found, use any stay with dates
          if (!mostRecentStay) {
            for (const stayId of record.fields.stay) {
              const stay = staysById[stayId];
              if (stay && stay.startDate && stay.endDate) {
                if (!mostRecentStay || new Date(stay.startDate) > new Date(mostRecentStay.startDate)) {
                  mostRecentStay = stay;
                }
              }
            }
          }
          
          // Use the most recent stay for calculations
          if (mostRecentStay) {
            startDate = mostRecentStay.startDate;
            endDate = mostRecentStay.endDate;
            houseName = mostRecentStay.houseName;
            
            const stayStartDate = new Date(startDate);
            const stayEndDate = new Date(endDate);
            
            // Calculate number of days (including both start and end date)
            const days = Math.ceil((stayEndDate - stayStartDate) / (1000 * 60 * 60 * 24)) + 1;
            
            // Calculate rent at $25 per day
            rentCost = days * 25;
            
            // Calculate food cost at $150/7 per day
            foodCost = days * (150 / 7);
          }
        }

        // Calculate flight stipend amount based on approvedFlightStipend and country
        let stipendAmount = 0;
        const approvedFlightStipend = record.fields.approvedFlightStipend || false;
        const country = record.fields.country || "";
        
        if (approvedFlightStipend === true) {
          stipendAmount = country === "US" ? 500 : 750;
        }

        return {
          id: record.id,
          slackId: record.fields["Slack ID (from slackNeighbor)"] || null,
          slackFullName: record.fields["Full Name (from slackNeighbor)"] || null,
          fullName: record.fields["Full Name"] || null,
          totalTimeHackatimeHours: Math.round(record.fields.totalTimeHackatimeHours || 0),
          weightedGrantsContribution: record.fields.weightedGrantsContribution || 0,
          rentCost: rentCost,
          foodCost: foodCost,
          approvedFlightStipend: approvedFlightStipend,
          country: country,
          stipendAmount: stipendAmount,
          startDate: startDate,
          endDate: endDate,
          houseName: houseName
        };
      })
      // Filter out neighbors who have BOTH under 1 hour hackatime AND 0 weightedGrantsContribution
      .filter(neighbor => {
        // Keep if they have >= 1 hour hackatime OR they have some grants contribution
        return neighbor.totalTimeHackatimeHours >= 1 || neighbor.weightedGrantsContribution > 0;
      });

    return res.status(200).json({ 
      neighbors,
      houses: uniqueHouseNames
    });
  } catch (error) {
    console.error("Error fetching neighbors costs:", error);
    return res.status(500).json({ message: "Error fetching neighbors costs" });
  }
} 