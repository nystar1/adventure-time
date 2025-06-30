import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function InPersonLeaderboard() {
  const [neighbors, setNeighbors] = useState([]);
  const [stopwatchData, setStopwatchData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortType, setSortType] = useState('largestLogged');
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [neighborsResponse, stopwatchResponse] = await Promise.all([
          fetch('/api/getInPersonNeighbors'),
          fetch('/api/getWeeklyInPersonCommits')
        ]);

        if (!neighborsResponse.ok) {
          throw new Error('Failed to fetch in-person neighbors');
        }
        if (!stopwatchResponse.ok) {
          throw new Error('Failed to fetch stopwatch data');
        }

        const neighborsData = await neighborsResponse.json();
        const stopwatchData = await stopwatchResponse.json();

        const stopwatchMap = {};
        stopwatchData.users.forEach(user => {
          stopwatchMap[user.slackId] = user;
        });

        setNeighbors(neighborsData.neighbors);
        setStopwatchData(stopwatchMap);
      } catch (err) {
        setError('Failed to load data: ' + err.message);
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const sortedNeighbors = [...neighbors].sort((a, b) => {
    if (sortType === 'largestLogged') {
      return b.weeklyHours - a.weeklyHours;
    } else if (sortType === 'smallestLogged') {
      return a.weeklyHours - b.weeklyHours;
    } else if (sortType === 'largestStopwatch') {
      const aMinutes = stopwatchData[a.slackId]?.totalMinutes || 0;
      const bMinutes = stopwatchData[b.slackId]?.totalMinutes || 0;
      return bMinutes - aMinutes;
    } else if (sortType === 'largestCombined') {
      const aCombined = a.weeklyHours + ((stopwatchData[a.slackId]?.totalMinutes || 0) / 60);
      const bCombined = b.weeklyHours + ((stopwatchData[b.slackId]?.totalMinutes || 0) / 60);
      return bCombined - aCombined;
    } else if (sortType === 'mostHackatime') {
      return b.weeklyHours - a.weeklyHours;
    } else if (sortType === 'leastHackatime') {
      return a.weeklyHours - b.weeklyHours;
    }
    return 0;
  });

  const breadcrumbItems = [
    { label: "Adventure Time", href: "/" },
    { label: "Neighborhood", href: "/neighborhood" },
    { label: "In-person Weekly Leaderboard", href: "/neighborhood/in-person" }
  ];

  const getWeekRange = () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    const dayOfWeek = startOfWeek.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startOfWeek.setDate(now.getDate() + diff);
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
            <option value="largestStopwatch">Most stopwatch hours</option>
            <option value="largestCombined">Most combined hours</option>
            <option value="mostHackatime">Most Hackatime hours</option>
            <option value="leastHackatime">Least Hackatime hours</option>
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
                {sortedNeighbors.map((neighbor) => {
                  const stopwatchMinutes = stopwatchData[neighbor.slackId]?.totalMinutes || 0;
                  const stopwatchHours = (stopwatchMinutes / 60).toFixed(1);
                  const combinedHours = (parseFloat(neighbor.weeklyHours) + parseFloat(stopwatchHours)).toFixed(1);

                  return (
                    <li key={neighbor.id} style={{ marginBottom: '12px' }}>
                      <div>
                        <Link href={`/neighborhood/${neighbor.slackId}`}>
                          {neighbor.fullName || neighbor.slackFullName || neighbor.slackId || "unnamed"}
                        </Link>
                        {" "}({neighbor.weeklyHours}hr hackatime + {stopwatchHours}hr stopwatch = {combinedHours}hr total)
                      </div>
                      {selectedUser === neighbor.slackId && stopwatchData[neighbor.slackId]?.commits?.length > 0 && (
                        <div style={{ marginTop: '8px', marginLeft: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                          <h3>Stopwatch Sessions</h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {stopwatchData[neighbor.slackId].commits.map(commit => (
                              <div key={commit.commitId} style={{ display: 'flex', gap: '10px' }}>
                                {commit.videoLink && (
                                  <video 
                                    controls 
                                    src={commit.videoLink} 
                                    style={{ maxWidth: 120, maxHeight: '200px' }}
                                  />
                                )}
                                <div>
                                  <p style={{ margin: '4px 0', fontWeight: 'bold' }}>{commit.appName}</p>
                                  <p style={{ margin: '4px 0' }}>{commit.message}</p>
                                  <p style={{ margin: '4px 0', fontSize: '0.9rem', color: '#666' }}>
                                    {new Date(commit.commitTime).toLocaleString()} • {commit.duration} minutes
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </>
        )}
      </div>
    </>
  );
}
