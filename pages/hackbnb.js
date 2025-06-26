import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function HackBnB() {
  const [hasToken, setHasToken] = useState(false);
  const [pfp, setPfp] = useState(null);
  const [houses, setHouses] = useState([]);
  const [token, setToken] = useState('');
  const router = useRouter();

  const [viewMode, setViewMode] = useState("listings");
  const [arrivalDate, setArrivalDate] = useState("");
  const [exitDate, setExitDate] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [hasFlight, setHasFlight] = useState(false);
  const [selectedHouse, setSelectedHouse] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [onlyCountFlights, setOnlyCountFlights] = useState(true);
  const [onlyCountStipend, setOnlyCountStipend] = useState(false);
  const [filterPendingWithUnder100Hours, setFilterPendingWithUnder100Hours] = useState(false);

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
    const storedToken = localStorage.getItem('authToken');
    if (!storedToken) {
      // Save intended page and redirect to login
      localStorage.setItem('redirectAfterLogin', '/hackbnb');
      router.replace('/login');
      return;
    }
    setToken(storedToken);
    setHasToken(true);
    fetchPfp(storedToken);
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
      if (data.houses && data.houses.length > 0) {
        setSelectedHouse(data.houses[0].id);
      }
    } catch (err) {
      console.error('Error fetching houses:', err);
    }
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
  };

  const handleSubmitBooking = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      const response = await fetch('/api/createStay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          houseId: selectedHouse,
          arrivalDate,
          exitDate,
          hasFlight
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit booking request');
      }
      
      // Show different message based on whether the stay was created or updated
      const action = data.action === 'created' ? 'submitted' : 'updated';
      alert(`Booking request ${action} successfully!`);
      setViewMode('listings');
      
      // Refresh the page to update the listings with the new/updated booking
      window.location.reload();
    } catch (error) {
      console.error('Error submitting booking:', error);
      setSubmitError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get stays for the selected date
  const getStaysForDate = (house) => {
    if (!house.stays || house.stays.length === 0) return [];
    
    return house.stays.filter(stay => {
      if (!stay.start_date || !stay.end_date) return false;
      
      const startDate = new Date(stay.start_date);
      const endDate = new Date(stay.end_date);
      
      // Check if selectedDate is between start_date and end_date (inclusive)
      return selectedDate >= startDate && selectedDate <= endDate;
    });
  };

  // Get confirmed and pending stays
  const getStaysByStatus = (house) => {
    const staysForDate = getStaysForDate(house);
    
    return {
      confirmed: staysForDate.filter(stay => stay.bookingStatus === "Confirmed"),
      pending: staysForDate.filter(stay => stay.bookingStatus === "Pending")
    };
  };

  // Calculate total over capacity for a specific date
  const calculateTotalOverCapacity = (date) => {
    let totalOverCapacity = 0;
    
    houses.forEach(house => {
      if (!house.capacity) return;
      
      // Get stays for this specific date
      const staysForDate = house.stays ? house.stays.filter(stay => {
        if (!stay.start_date || !stay.end_date) return false;
        
        const startDate = new Date(stay.start_date);
        const endDate = new Date(stay.end_date);
        
        // Check if date is between start_date and end_date (inclusive)
        return date >= startDate && date <= endDate;
      }) : [];
      
      // Calculate over capacity based on filters
      const confirmedStays = staysForDate.filter(stay => stay.bookingStatus === "Confirmed");
      const pendingStays = staysForDate.filter(stay => stay.bookingStatus === "Pending");
      
      // Apply filters to pending stays
      let pendingStaysToCount = pendingStays;
      
      // Filter by flight status if enabled
      if (onlyCountFlights) {
        pendingStaysToCount = pendingStaysToCount.filter(stay => stay.hasFlight === true);
      }
      
      // Filter by stipend approval if enabled
      if (onlyCountStipend) {
        pendingStaysToCount = pendingStaysToCount.filter(stay => stay.approvedForStipend === true);
      }
      
      const totalCount = confirmedStays.length + pendingStaysToCount.length;
      const overCapacity = totalCount - house.capacity;
      
      if (overCapacity > 0) {
        totalOverCapacity += overCapacity;
      }
    });
    
    return totalOverCapacity;
  };
  
  // Get color based on over capacity amount
  const getOverCapacityColor = (overCapacity) => {
    if (overCapacity <= 0) return 'transparent';
    
    // Calculate darkness - max darkness at 10 or more over capacity
    const opacity = Math.min(0.9, 0.3 + (overCapacity * 0.06));
    return `rgba(220, 38, 38, ${opacity})`;
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
      
      // Calculate over capacity for this date
      const overCapacity = calculateTotalOverCapacity(currentDate);
      const backgroundColor = isSelected ? '#000' : getOverCapacityColor(overCapacity);
        
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
            backgroundColor: backgroundColor,
            color: isSelected ? 'white' : overCapacity > 0 ? 'white' : 'black',
            borderRadius: '2px',
            position: 'relative'
          }}
        >
          {i}
          {overCapacity > 0 && !isSelected && (
            <div style={{
              position: 'absolute',
              bottom: '2px',
              right: '2px',
              fontSize: '7px',
              fontWeight: 'bold'
            }}>
              +{overCapacity}
            </div>
          )}
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
          <div style={{ marginBottom: '15px' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              fontSize: '12px',
              cursor: 'pointer',
              marginBottom: '8px'
            }}>
              <input 
                type="checkbox" 
                checked={onlyCountFlights} 
                onChange={(e) => setOnlyCountFlights(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Capacity graph only considers those with flights
            </label>
            
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              fontSize: '12px',
              cursor: 'pointer'
            }}>
              <input 
                type="checkbox" 
                checked={onlyCountStipend} 
                onChange={(e) => setOnlyCountStipend(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Only show those approved for stipend
            </label>
          </div>
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
                  <div style={{ marginLeft: '10px' }}>
                    <span>{house.name}</span>
                    {house.capacity && (
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {(() => {
                          const { confirmed, pending } = getStaysByStatus(house);
                          
                          // Apply filters to pending stays
                          let pendingToCount = pending;
                          
                          // Filter by flight status if enabled
                          if (onlyCountFlights) {
                            pendingToCount = pendingToCount.filter(stay => stay.hasFlight === true);
                          }
                          
                          // Filter by stipend approval if enabled
                          if (onlyCountStipend) {
                            pendingToCount = pendingToCount.filter(stay => stay.approvedForStipend === true);
                          }
                          
                          const totalOccupants = confirmed.length + pendingToCount.length;
                          const overBy = totalOccupants - house.capacity;
                          
                          return (
                            <>
                              Capacity: {house.capacity}
                              {overBy > 0 && <span style={{ color: '#e53e3e' }}> (over by {overBy})</span>}
                              {overBy === 0 && totalOccupants > 0 && <span style={{ color: '#38a169' }}> (at capacity)</span>}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
                
                <div style={{ marginTop: '10px', marginLeft: '10px' }}>
                  {(() => {
                    const { confirmed, pending } = getStaysByStatus(house);
                    const hasStays = confirmed.length > 0 || pending.length > 0;
                    
                    if (!hasStays) {
                      return <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>No guests</p>;
                    }
                    
                    return (
                      <>
                        {confirmed.length > 0 && (
                          <div style={{ marginBottom: '10px' }}>
                            <p style={{ margin: '0 0 5px 0', fontWeight: '500', fontSize: '14px' }}>Roommates:</p>
                            <ul style={{ margin: '0', paddingLeft: '20px' }}>
                              {confirmed.map(stay => (
                                <li key={stay.id} style={{ marginBottom: '5px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center' }}>
                                    {stay.pfp && stay.pfp.length > 0 && (
                                      <div style={{ 
                                        width: '16px', 
                                        height: '16px', 
                                        marginRight: '8px',
                                        backgroundColor: '#9CA3AF',
                                        borderRadius: '3px',
                                        border: '1px solid #fff',
                                        boxShadow: '0 0 0 1px #ccc',
                                        overflow: 'hidden'
                                      }}>
                                        <img 
                                          src={stay.pfp[0].thumbnails?.small?.url || stay.pfp[0].url} 
                                          alt={stay.fullName}
                                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                      </div>
                                    )}
                                    <span>{stay.fullName || stay.handle}</span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {pending.length > 0 && (
                          <div>
                            <p style={{ margin: '0 0 5px 0', fontWeight: '500', fontSize: '14px' }}>Pending Bookings:</p>
                            <ul style={{ margin: '0', paddingLeft: '20px' }}>
                              {pending.map(stay => (
                                <li key={stay.id} style={{ marginBottom: '5px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center' }}>
                                    {stay.pfp && stay.pfp.length > 0 && (
                                      <div style={{ 
                                        width: '16px', 
                                        height: '16px', 
                                        marginRight: '8px',
                                        backgroundColor: '#9CA3AF',
                                        borderRadius: '3px',
                                        border: '1px solid #fff',
                                        boxShadow: '0 0 0 1px #ccc',
                                        overflow: 'hidden'
                                      }}>
                                        <img 
                                          src={stay.pfp[0].thumbnails?.small?.url || stay.pfp[0].url} 
                                          alt={stay.fullName}
                                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                      </div>
                                    )}
                                    <span>
                                      {stay.fullName || stay.handle}
                                      {stay.hasFlight && <span style={{ marginLeft: '5px' }}>(✈️)</span>}
                                    </span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    );
                  })()}
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
            {houses.length === 0 && <p>Loading Houses</p>}
          </div>
        </div>
      </div>
      ) : (
      <div>
        <h3>Request your stay in Neighborhood</h3>
        <form onSubmit={handleSubmitBooking}>
          <div>
            <label htmlFor="house-select">Preferred House:</label>
            <select 
              id="house-select"
              value={selectedHouse}
              onChange={(e) => setSelectedHouse(e.target.value)}
              required
            >
              <option value="" disabled>Select a house</option>
              {houses.map(house => (
                <option key={house.id} value={house.id}>{house.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="arrival-date">Arrival Date:</label>
            <input 
              id="arrival-date"
              type="date" 
              value={arrivalDate} 
              onChange={(e) => setArrivalDate(e.target.value)}
              required
            />
          </div>
          
          <div>
            <label htmlFor="exit-date">Exit Date:</label>
            <input 
              id="exit-date"
              type="date" 
              value={exitDate} 
              onChange={(e) => setExitDate(e.target.value)}
              required
            />
          </div>
          
          <div>
            <label>
              <input 
                type="checkbox"
                checked={hasFlight}
                onChange={(e) => setHasFlight(e.target.checked)}
              />
              <span>I have a flight <i>(optional, not suggested before approval)</i></span>
            </label>
          </div>
          
          {submitError && <div style={{ color: 'red', margin: '10px 0' }}>{submitError}</div>}
          
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Booking Request'}
          </button>
        </form>
      </div>
      )
    }
    </>
  );
}
