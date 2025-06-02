import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function InPersonLeaderboard() {
  const [neighbors, setNeighbors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortType, setSortType] = useState('largestLogged');

  useEffect(() => {
    const fetchNeighbors = async () => {
      try {
        const response = await fetch('/api/getInPersonNeighbors');
        if (!response.ok) {
          throw new Error('Failed to fetch in-person neighbors');
        }
        const data = await response.json();
        setNeighbors(data.neighbors);
      } catch (err) {
        setError('Failed to load in-person neighbors');
        console.error('Error fetching in-person neighbors:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNeighbors();
  }, []);

  const sortedNeighbors = [...neighbors].sort((a, b) => {
    if (sortType === 'largestLogged') {
      return b.weeklyHours - a.weeklyHours;
    } else if (sortType === 'smallestLogged') {
      return a.weeklyHours - b.weeklyHours;
    }
    return 0;
  });

  const breadcrumbItems = [
    { label: "Adventure Time", href: "/" },
    { label: "Neighborhood", href: "/neighborhood" },
    { label: "In-person Weekly Leaderboard", href: "/neighborhood/in-person" }
  ];

  // Get current week's date range
  const getWeekRange = () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return `${startOfWeek.toLocaleDateString()} - ${endOfWeek.toLocaleDateString()}`;
  };

  return (
    <>
      <Head>
        <title>In-person Weekly Leaderboard - Adventure Time</title>
        <meta name="description" content="View the weekly in-person leaderboard for Hack Club contributors" />
      </Head>
      <div>
        <Breadcrumbs items={breadcrumbItems} />
        <h1>In-person Weekly Leaderboard</h1>
        <p style={{ color: '#666', marginBottom: '1rem' }}>Week of {getWeekRange()}</p>
        
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="sortType">Sort by: </label>
          <select
            id="sortType"
            value={sortType}
            onChange={e => setSortType(e.target.value)}
          >
            <option value="largestLogged">Most hours this week</option>
            <option value="smallestLogged">Least hours this week</option>
          </select>
        </div>
        
        {loading && <p>Loading in-person neighbors...</p>}
        {error && <p>{error}</p>}
        
        {!loading && !error && (
          <>
            {neighbors.length === 0 ? (
              <p>No in-person neighbors found for this week.</p>
            ) : (
              <ol>
                {sortedNeighbors.map((neighbor) => (
                  <li key={neighbor.id}>
                    <Link href={`/neighborhood/${neighbor.slackId}`}>
                      {neighbor.fullName || neighbor.slackFullName || neighbor.slackId || "unnamed"}
                    </Link>
                    {" "}({neighbor.weeklyHours}hr this week)
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </div>
    </>
  );
} 