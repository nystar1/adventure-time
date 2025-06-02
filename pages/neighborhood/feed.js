import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function Feed() {
  const [allPosts, setAllPosts] = useState([]);
  const [displayedPosts, setDisplayedPosts] = useState([]);
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
      setDisplayedPosts(data.posts.slice(0, displayCount));
      
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

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleLoadMore = () => {
    const newCount = displayCount + 10;
    setDisplayCount(newCount);
    setDisplayedPosts(allPosts.slice(0, newCount));
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
            {displayedPosts.length === 0 ? (
              <p>No posts found.</p>
            ) : (
              <>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {displayedPosts.map((post) => {
                    const neighborPfp = getNeighborPfp(post.slackId);
                    const neighborName = getNeighborName(post.slackId);
                    
                    return (
                      <li key={post.id} style={{ marginBottom: 24 }}>
                        <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                          {neighborPfp && (
                            <img
                              src={neighborPfp}
                              alt="pfp"
                              style={{ width: 24, height: 24, borderRadius: '4px', border: '2px solid #fff', boxShadow: '0 0 0 1px #ccc' }}
                            />
                          )}
                          <Link href={`/neighborhood/${post.slackId}`} style={{ textDecoration: 'underline', color: '#0070f3' }}>
                            {neighborName}
                          </Link>
                          {" "}in{" "}
                          <Link href={`/neighborhood/${post.slackId}/${encodeURIComponent(post.appName)}`} style={{ textDecoration: 'underline', color: '#0070f3' }}>
                            {post.appName}
                          </Link>
                        </div>

                        {(post.demoVideo || post.photoboothVideo) && (
                          <div style={{ display: 'flex', flexDirection: 'row', gap: 8, margin: '8px 0' }}>
                            {post.photoboothVideo && (
                              <video src={post.photoboothVideo} controls width={160} style={{ maxWidth: '100%' }} />
                            )}
                            {post.demoVideo && (
                              <video src={post.demoVideo} controls width={160} style={{ maxWidth: '100%' }} />
                            )}
                          </div>
                        )}

                        {post.content && <div style={{ margin: '8px 0' }}>{post.content}</div>}

                        <div style={{ marginTop: '8px', fontSize: '0.9em', color: '#666' }}>
                          <div>Review Status: {post.review_status || 'pending'}</div>
                          {post.approved_time_hours && (
                            <div>Approved Hours: {formatHoursToHoursMinutes(post.approved_time_hours)}</div>
                          )}
                          {post.review_comment && (
                            <div>Review Comment: {post.review_comment}</div>
                          )}
                        </div>

                        <div style={{ marginTop: '8px', fontSize: '0.9em', color: '#666' }}>
                          {new Date(post.createdAt).toLocaleString()}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                
                {displayCount < allPosts.length && (
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
                )}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
} 