import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function Feed() {
  const [allPosts, setAllPosts] = useState([]);
  const [allShips, setAllShips] = useState([]);
  const [displayedTimeline, setDisplayedTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [displayCount, setDisplayCount] = useState(10);
  const [neighborDetails, setNeighborDetails] = useState({});

  const fetchNeighborDetails = async (slackId) => {
    if (neighborDetails[slackId]) return;
    
    try {
      const response = await fetch(`/api/getNeighborDetails?slackId=${slackId}`);
      if (!response.ok) throw new Error('Failed to fetch neighbor details');
      const data = await response.json();
      setNeighborDetails(prev => ({
        ...prev,
        [slackId]: data.neighbor
      }));
    } catch (err) {
      console.error('Error fetching neighbor details:', err);
    }
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/getRecentPosts?page=1&limit=100`);
      if (!response.ok) throw new Error('Failed to fetch posts');
      const data = await response.json();
      
      setAllPosts(data.posts);
      
      // Fetch neighbor details for all posts
      data.posts.forEach(post => {
        if (post.slackId) {
          fetchNeighborDetails(post.slackId);
        }
      });
      
      setLoading(false);
    } catch (err) {
      setError('Failed to load posts');
      console.error('Error fetching posts:', err);
      setLoading(false);
    }
  };

  const fetchShips = async () => {
    try {
      const response = await fetch(`/api/getRecentShips?limit=100`);
      if (!response.ok) throw new Error('Failed to fetch ships');
      const data = await response.json();
      setAllShips(data.ships || []);
    } catch (err) {
      console.error('Error fetching ships:', err);
    }
  };

  useEffect(() => {
    fetchPosts();
    fetchShips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Merge posts and ships into a single timeline, sorted by createdAt
    const timeline = [
      ...allPosts.map(post => ({ ...post, _type: 'post' })),
      ...allShips.map(ship => ({ ...ship, _type: 'ship' }))
    ].filter(item => item.createdAt).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setDisplayedTimeline(timeline.slice(0, displayCount));
  }, [allPosts, allShips, displayCount]);

  const handleLoadMore = () => {
    const newCount = displayCount + 10;
    setDisplayCount(newCount);
    setDisplayedTimeline(displayedTimeline.slice(0, newCount));
  };

  const breadcrumbItems = [
    { label: "Adventure Time", href: "/" },
    { label: "Neighborhood", href: "/neighborhood" },
    { label: "Feed", href: "/neighborhood/feed" }
  ];

  const formatHoursToHoursMinutes = (hours) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  };

  const getNeighborName = (slackId) => {
    const neighbor = neighborDetails[slackId];
    return neighbor?.fullName || neighbor?.slackFullName || slackId || 'unnamed';
  };

  const getNeighborPfp = (slackId) => {
    return neighborDetails[slackId]?.pfp;
  };

  return (
    <>
      <Head>
        <title>Recent Posts - Adventure Time</title>
        <meta name="description" content="View recent posts from Hack Club contributors" />
      </Head>
      <div>
        <Breadcrumbs items={breadcrumbItems} />
        <h1>Recent Posts</h1>
        
        {loading && <p>Loading posts...</p>}
        {error && <p>{error}</p>}
        
        {!loading && !error && (
          <>
            {displayedTimeline.length === 0 ? (
              <p>No posts or ships found.</p>
            ) : (
              <>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {displayedTimeline.map((item, idx) => {
                    if (item._type === 'post') {
                      const neighborPfp = getNeighborPfp(item.slackId);
                      const neighborName = getNeighborName(item.slackId);
                      return (
                        <li key={item.id} style={{ marginBottom: 24 }}>
                          <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                            {neighborPfp && (
                              <img
                                src={neighborPfp}
                                alt="pfp"
                                style={{ width: 24, height: 24, borderRadius: '4px', border: '2px solid #fff', boxShadow: '0 0 0 1px #ccc' }}
                              />
                            )}
                            <Link href={`/neighborhood/${item.slackId}`} style={{ textDecoration: 'underline', color: '#0070f3' }}>
                              {neighborName}
                            </Link>
                            {" "}in{" "}
                            <Link href={`/neighborhood/${item.slackId}/${encodeURIComponent(item.appName)}`} style={{ textDecoration: 'underline', color: '#0070f3' }}>
                              {item.appName}
                            </Link>
                          </div>

                          {(item.demoVideo || item.photoboothVideo) && (
                            <div style={{ display: 'flex', flexDirection: 'row', gap: 8, margin: '8px 0' }}>
                              {item.photoboothVideo && (
                                <video src={item.photoboothVideo} controls width={160} style={{ maxWidth: '100%' }} />
                              )}
                              {item.demoVideo && (
                                <video src={item.demoVideo} controls width={160} style={{ maxWidth: '100%' }} />
                              )}
                            </div>
                          )}

                          {item.content && <div style={{ margin: '8px 0' }}>{item.content}</div>}

                          <div style={{ marginTop: '8px', fontSize: '0.9em', color: '#666' }}>
                            <div>Review Status: {item.review_status || 'pending'}</div>
                            {item.approved_time_hours && (
                              <div>Approved Hours: {formatHoursToHoursMinutes(item.approved_time_hours)}</div>
                            )}
                            {item.review_comment && (
                              <div>Review Comment: {item.review_comment}</div>
                            )}
                          </div>

                          <div style={{ marginTop: '8px', fontSize: '0.9em', color: '#666' }}>
                            {new Date(item.createdAt).toLocaleString()}
                          </div>
                        </li>
                      );
                    } else if (item._type === 'ship') {
                      // Find the index of this ship among all ships in the timeline
                      const shipsInTimeline = displayedTimeline.filter(t => t._type === 'ship' && new Date(t.createdAt) <= new Date(item.createdAt));
                      // const shipTimelineIndex = shipsInTimeline.indexOf(item);
                      // const releaseLabel = shipTimelineIndex === 0 ? 'Release 1.0' : `Release 1.${shipTimelineIndex}`;
                      const appName = item.appName || '';
                      const neighborPfp = getNeighborPfp(item.slackId);
                      const neighborName = getNeighborName(item.slackId);
                      return (
                        <li key={item.id} style={{ marginBottom: 24 }}>
                          <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                            {neighborPfp && (
                              <img
                                src={neighborPfp}
                                alt="pfp"
                                style={{ width: 24, height: 24, borderRadius: '4px', border: '2px solid #fff', boxShadow: '0 0 0 1px #ccc' }}
                              />
                            )}
                            <Link href={`/neighborhood/${item.slackId}`} style={{ textDecoration: 'underline', color: '#0070f3' }}>
                              {neighborName}
                            </Link>
                            {" in "}
                            <Link href={`/neighborhood/${item.slackId}/${encodeURIComponent(appName)}`} style={{ textDecoration: 'underline', color: '#0070f3' }}>
                              {appName}
                            </Link>
                            {` shipped a new release`}
                          </div>
                          {item.changesMade && <p>{item.changesMade}</p>}
                          {item.codeUrl && (
                            <div>
                              <a href={item.codeUrl} target="_blank" rel="noopener noreferrer">
                                {item.codeUrl}
                              </a>
                            </div>
                          )}
                          {item.playableUrl && (
                            <div>
                              <a href={item.playableUrl} target="_blank" rel="noopener noreferrer">
                                {item.playableUrl}
                              </a>
                            </div>
                          )}
                          <br/>
                          <strong>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</strong>
                        </li>
                      );
                    }
                    return null;
                  })}
                </ul>
                
                  <div style={{ textAlign: 'center', margin: '20px 0' }}>
                    <p 
                      onClick={handleLoadMore}
                      style={{ 
                        color: '#0070f3', 
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        display: 'inline-block'
                      }}
                    >
                      Load More
                    </p>
                  </div>
                
              </>
            )}
          </>
        )}
      </div>
    </>
  );
} 