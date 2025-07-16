import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function ReturnFlightDashboard() {
  const [participants, setParticipants] = useState({
    notBooked: [],
    booked: [],
    independenceProgram: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper function to generate Google Flights URL from SFO to destination airport
  const generateFlightLink = (destinationAirport) => {
    if (!destinationAirport) return null;
    
    // Encode the destination airport for the URL
    const encodedDestination = encodeURIComponent(destinationAirport);
    
    // Create a Google Flights search URL from SFO to the destination
    // Using a simple format that should work for most airports
    return `https://www.google.com/travel/flights?hl=en&curr=USD&f=0&tfs=CAEQAxoaagwIAhIIL20vMDJqX18SCjIwMjQtMDctMjcaGhIKMjAyNC0wNy0yN3IMCAISCC9tLzAyal9f&q=Flights%20from%20SFO%20to%20${encodedDestination}`;
  };

  const breadcrumbItems = [
    { label: "Adventure Time", href: "/" },
    { label: "Return Flight Dashboard", href: "/return-flight-dashboard" }
  ];

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const response = await fetch('/api/getReturnFlightParticipants');
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch participants');
        }

        // Transform the data to match our component's expected format
        const categorized = { notBooked: [], booked: [], independenceProgram: [] };
        [
          ...data.participants.notBooked,
          ...data.participants.booked,
          ...data.participants.independenceProgram
        ].forEach(p => {
          const participant = {
            id: p.id,
            name: p.fullName || p.slackFullName || p.slackId || "Unknown",
            email: p.githubUsername ? `${p.githubUsername}@github.com` : "No email",
            slackId: p.slackId || "No Slack ID",
            pfp: p.pfp,
            weightedGrantsContribution: p.weightedGrantsContribution || 0,
            age: p.age,
            airport: p.airport,
            flightBookedHome: p.flightBookedHome,
            independenceProgram: p.independenceProgram,
            reason: p.returnFlightReason || "No reason provided"
          };
          if (participant.independenceProgram) {
            categorized.independenceProgram.push(participant);
          } else if (participant.flightBookedHome) {
            categorized.booked.push(participant);
          } else {
            categorized.notBooked.push(participant);
          }
        });
        setParticipants(categorized);
      } catch (err) {
        setError('Failed to load participants');
        console.error('Error fetching participants:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchParticipants();
  }, []);



  if (loading) {
    return (
      <>
        <Head>
          <title>Return Flight Dashboard - Adventure Time</title>
          <meta name="description" content="Track return flight bookings for adventure participants" />
        </Head>
        <div>
          <Breadcrumbs items={breadcrumbItems} />
          <div style={{ textAlign: "center", padding: "40px" }}>
            <div>Loading flight dashboard...</div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Head>
          <title>Return Flight Dashboard - Adventure Time</title>
          <meta name="description" content="Track return flight bookings for adventure participants" />
        </Head>
        <div>
          <Breadcrumbs items={breadcrumbItems} />
          <div style={{ color: "#dc2626", padding: "16px", backgroundColor: "#fee2e2", borderRadius: "8px", margin: "16px 0" }}>
            Error: {error}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Return Flight Dashboard - Adventure Time</title>
        <meta name="description" content="Track return flight bookings for adventure participants" />
      </Head>
      <div>
        <Breadcrumbs items={breadcrumbItems} />
        <h1>Return Flight Dashboard</h1>
        
        {loading && <p>Loading participants...</p>}
        {error && <p>{error}</p>}
        
        {!loading && !error && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
            <div>
              <h2>Not Booked For Flight ({participants.notBooked.length})</h2>
              <ol>
                {participants.notBooked.map((participant, index) => (
                  <li key={participant.id || index}>
                    {participant.pfp ? (
                      <img 
                        src={participant.pfp} 
                        alt="Profile" 
                        style={{ 
                          width: "24px", 
                          height: "24px", 
                          borderRadius: "4px",
                          border: "2px solid #fff",
                          boxShadow: "0 0 0 1px #ccc",
                          marginRight: "8px",
                          verticalAlign: "middle"
                        }}
                      />
                    ) : (
                      <div style={{ 
                        width: "24px", 
                        height: "24px", 
                        backgroundColor: "#9CA3AF",
                        borderRadius: "4px",
                        border: "2px solid #fff",
                        boxShadow: "0 0 0 1px #ccc",
                        marginRight: "8px",
                        display: "inline-block",
                        verticalAlign: "middle"
                      }}></div>
                    )}
                    <Link href={`/neighborhood/${participant.slackId}`}>
                      {participant.name}
                    </Link>
                    {participant.age && ` (${participant.age}yrs old)`}
                    {participant.airport && ` (${participant.airport})`}
                    {participant.weightedGrantsContribution > 0 && ` (${participant.weightedGrantsContribution.toFixed(1)})`}
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <h2>Booked for Flight ({participants.booked.length})</h2>
              <ol>
                {participants.booked.map((participant, index) => (
                  <li key={participant.id || index}>
                    {participant.pfp ? (
                      <img 
                        src={participant.pfp} 
                        alt="Profile" 
                        style={{ 
                          width: "24px", 
                          height: "24px", 
                          borderRadius: "4px",
                          border: "2px solid #fff",
                          boxShadow: "0 0 0 1px #ccc",
                          marginRight: "8px",
                          verticalAlign: "middle"
                        }}
                      />
                    ) : (
                      <div style={{ 
                        width: "24px", 
                        height: "24px", 
                        backgroundColor: "#9CA3AF",
                        borderRadius: "4px",
                        border: "2px solid #fff",
                        boxShadow: "0 0 0 1px #ccc",
                        marginRight: "8px",
                        display: "inline-block",
                        verticalAlign: "middle"
                      }}></div>
                    )}
                    <Link href={`/neighborhood/${participant.slackId}`}>
                      {participant.name}
                    </Link>
                    {participant.age && ` (${participant.age}yrs old)`}
                    {participant.airport && ` (${participant.airport})`}
                    {participant.weightedGrantsContribution > 0 && ` (${participant.weightedGrantsContribution.toFixed(1)})`}
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <h2>Independence Program ({participants.independenceProgram.length})</h2>
              <ol>
                {participants.independenceProgram.map((participant, index) => (
                  <li key={participant.id || index}>
                    {participant.pfp ? (
                      <img 
                        src={participant.pfp} 
                        alt="Profile" 
                        style={{ 
                          width: "24px", 
                          height: "24px", 
                          borderRadius: "4px",
                          border: "2px solid #fff",
                          boxShadow: "0 0 0 1px #ccc",
                          marginRight: "8px",
                          verticalAlign: "middle"
                        }}
                      />
                    ) : (
                      <div style={{ 
                        width: "24px", 
                        height: "24px", 
                        backgroundColor: "#9CA3AF",
                        borderRadius: "4px",
                        border: "2px solid #fff",
                        boxShadow: "0 0 0 1px #ccc",
                        marginRight: "8px",
                        display: "inline-block",
                        verticalAlign: "middle"
                      }}></div>
                    )}
                    <Link href={`/neighborhood/${participant.slackId}`}>
                      {participant.name}
                    </Link>
                    {participant.age && ` (${participant.age}yrs old)`}
                    {participant.airport && ` (${participant.airport})`}
                    {participant.weightedGrantsContribution > 0 && ` (${participant.weightedGrantsContribution.toFixed(1)})`}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>
    </>
  );
} 