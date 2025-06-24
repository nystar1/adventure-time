import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function HackBnB() {
  const [hasToken, setHasToken] = useState(false);
  const [pfp, setPfp] = useState(null);
  const [houses, setHouses] = useState([]);
  const router = useRouter();

  const [viewMode, setViewMode] = useState("listings");
  const [arrivalDate, setArrivalDate] = useState("");
  const [exitDate, setExitDate] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Calendar data for June 23 - Aug 30, 2025
  const calendarData = {
    months: [
      { name: "June 2025", days: 30, startDay: 1 }, // June 2025 starts on Sunday (0)
      { name: "July 2025", days: 31, startDay: 3 }, // July 2025 starts on Tuesday (2)
      { name: "August 2025", days: 31, startDay: 6 } // August 2025 starts on Friday (5)
    ],
    startDate: new Date(2025, 5, 23), // June 23, 2025
    endDate: new Date(2025, 7, 30)    // August 30, 2025
  };

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      // Save intended page and redirect to login
      localStorage.setItem('redirectAfterLogin', '/hackbnb');
      router.replace('/login');
      return;
    }
    setHasToken(true);
    fetchPfp(token);
    fetchHouses();
  }, []);

  const fetchPfp = async (token) => {
    try {
      const response = await fetch(`/api/getMyPfp?token=${token}`);
      if (!response.ok) return;
      const data = await response.json();
      let url = null;
      if (Array.isArray(data.pfp) && data.pfp.length > 0) {
        url = data.pfp[0].thumbnails?.small?.url || data.pfp[0].url;
      } else if (typeof data.pfp === 'string') {
        url = data.pfp;
      }
      setPfp(url);
    } catch (err) {
      console.error('Error fetching profile picture:', err);
    }
  };

  const fetchHouses = async () => {
    try {
      const response = await fetch('/api/getHouses');
      if (!response.ok) {
        console.error('Failed to fetch houses');
        return;
      }
      const data = await response.json();
      setHouses(data.houses || []);
    } catch (err) {
      console.error('Error fetching houses:', err);
    }
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
  };

  // Generate calendar for a specific month
  const renderCalendar = (month) => {
    const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const days = [];
    
    // Add empty cells for days before the start day
    for (let i = 0; i < month.startDay; i++) {
      days.push(<div key={`empty-${i}`} style={{ width: '28px', height: '28px' }}></div>);
    }
    
    // Add the days of the month
    for (let i = 1; i <= month.days; i++) {
      const currentDate = new Date(2025, month.name === "June 2025" ? 5 : month.name === "July 2025" ? 6 : 7, i);
      
      // Skip dates before June 23 or after August 30
      if ((month.name === "June 2025" && i < 23) || (month.name === "August 2025" && i > 30)) {
        continue;
      }
      
      const isSelected = selectedDate && 
        selectedDate.getDate() === i && 
        selectedDate.getMonth() === currentDate.getMonth() &&
        selectedDate.getFullYear() === currentDate.getFullYear();
        
      days.push(
        <div 
          key={i}
          onClick={() => handleDateClick(currentDate)}
          style={{ 
            width: '28px', 
            height: '28px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            cursor: 'pointer',
            backgroundColor: isSelected ? '#000' : 'transparent',
            color: isSelected ? 'white' : 'black',
            borderRadius: '2px'
          }}
        >
          {i}
        </div>
      );
    }
    
    return (
      <div style={{ marginBottom: '15px' }}>
        <h4 style={{ margin: '10px 0' }}>{month.name}</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
          {dayNames.map(day => (
            <div key={day} style={{ fontWeight: 'bold', textAlign: 'center' }}>{day}</div>
          ))}
          {days}
        </div>
      </div>
    );
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div>
          <p><b>Hackbnb</b></p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {hasToken && (
            <>
              <button onClick={() => viewMode === "listings" ? setViewMode("bookings") : setViewMode("listings")}>{viewMode === "listings" ? "Request your stay" : "Cancel Request"}</button>
              <div style={{ 
                width: '24px', 
                height: '24px', 
                backgroundColor: '#9CA3AF',
                borderRadius: '4px',
                border: '2px solid #fff',
                boxShadow: '0 0 0 1px #ccc',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {pfp && (
                  <img src={pfp} alt="pfp" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 0 }} />
                )}
              </div>
            </>
          )}
        </div>
      </div>

    {viewMode === "listings" ? (
      <div style={{ display: 'flex', marginTop: '20px' }}>
        <div style={{ width: '200px', border: '1px solid #ddd', padding: '10px', borderRadius: '5px' }}>
          {calendarData.months.map(month => renderCalendar(month))}
        </div>
        <div style={{ display: 'flex', marginLeft: '20px', flexDirection: 'column' }}>
          <p>Current stays for {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

          <div style={{ display: 'flex', flexDirection: 'row', height: "100%" }}>
          {houses.map((house, index) => (
            <div key={house.id} style={{ 
              width: '200px',
              marginRight: index < houses.length - 1 ? '20px' : '0',
              position: 'relative'
            }}>
              <div style={{ 
                display: 'flex',
                alignItems: 'center'
              }}>
                <div style={{ 
                  width: '24px', 
                  height: '24px', 
                  backgroundColor: '#9CA3AF',
                  borderRadius: '4px',
                  border: '2px solid #fff',
                  boxShadow: '0 0 0 1px #ccc',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {house.thumbnail && house.thumbnail.length > 0 && (
                    <img 
                      src={house.thumbnail[0].thumbnails?.small?.url || house.thumbnail[0].url} 
                      alt={house.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 0 }}
                    />
                  )}
                </div>
                <span style={{ marginLeft: '10px' }}>{house.name}</span>
              </div>
              {index < houses.length - 1 && (
                <div style={{ 
                  position: 'absolute',
                  right: '-10px',
                  top: '0',
                  bottom: '0',
                  width: '1px',
                  backgroundColor: '#ddd'
                }}></div>
              )}
            </div>
          ))}
          {houses.length === 0 && <p>Loading houses...</p>}
          </div>
        </div>
      </div>
      ) : (
      <div>
        <p>Request your stay in Neighborhood</p>
        <div style={{ marginTop: '20px' }}>
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="arrival-date" style={{ display: 'block', marginBottom: '5px' }}>Arrival Date:</label>
            <input 
              id="arrival-date"
              type="date" 
              value={arrivalDate} 
              onChange={(e) => setArrivalDate(e.target.value)}
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="exit-date" style={{ display: 'block', marginBottom: '5px' }}>Exit Date:</label>
            <input 
              id="exit-date"
              type="date" 
              value={exitDate} 
              onChange={(e) => setExitDate(e.target.value)}
            />
          </div>
        </div>
      </div>
      )
    }
    </>
  );
}
