import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function AppPage() {
  const router = useRouter();
  const { contributor, app } = router.query;
  const [data, setData] = useState(null);
  const [contributorData, setContributorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [projectDetails, setProjectDetails] = useState({});
  const [posts, setPosts] = useState([]);
  const [contributorHours, setContributorHours] = useState({});

  useEffect(() => {
    const fetchDetails = async () => {
      if (!contributor || !app) return;
      const appName = decodeURIComponent(app);
      try {
        const [appRes, contributorRes, projectsRes] = await Promise.all([
          fetch(`/api/getAppDetails?slackId=${contributor}&appId=${encodeURIComponent(appName)}`),
          fetch(`/api/getNeighborDetails?slackId=${contributor}`),
          fetch(`/api/getAppUserHackatimeProjects?slackId=${contributor}&appName=${encodeURIComponent(appName)}`)
        ]);
        if (!appRes.ok || !contributorRes.ok || !projectsRes.ok) {
          throw new Error('Failed to fetch app, contributor, or projects details');
        }
        const appData = await appRes.json();
        const contributorData = await contributorRes.json();
        const projectsData = await projectsRes.json();
        setData(appData);
        setContributorData(contributorData);
        setProjects(projectsData.projects || []);
      } catch (err) {
        setError('Failed to load app, contributor, or projects details');
        console.error('Error fetching details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [contributor, app]);

  useEffect(() => {
    if (!projects.length) return;
    // Fetch Hackatime API data for each project
    projects.forEach((project) => {
      // Avoid refetching if already loaded
      if (projectDetails[project.id]) return;
      setProjectDetails(prev => ({ ...prev, [project.id]: { loading: true } }));
      // Use the local API route to avoid CORS
      fetch(`/api/getHackatimeProjectData?slackId=${contributor}&project=${encodeURIComponent(project.name)}`)
        .then(res => res.ok ? res.json() : Promise.reject(res))
        .then(data => {
          setProjectDetails(prev => ({ ...prev, [project.id]: { loading: false, data } }));
        })
        .catch(err => {
          setProjectDetails(prev => ({ ...prev, [project.id]: { loading: false, error: true } }));
        });
    });
    // Fetch Devlogs (Posts) for this user and app
    fetch(`/api/getAppUserPosts?slackId=${contributor}&appName=${encodeURIComponent(decodeURIComponent(app))}`)
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => {
        setPosts(data.posts || []);
      })
      .catch(() => setPosts([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, contributor, app]);

  useEffect(() => {
    if (!data?.app?.neighbors || !data.app.name) return;
    data.app.neighbors.forEach((neighbor) => {
      if (contributorHours[neighbor.slackId] !== undefined) return;
      setContributorHours((prev) => ({ ...prev, [neighbor.slackId]: { loading: true } }));
      fetch(`/api/getTotalHoursForProjectSpecificUser?slackId=${neighbor.slackId}&appName=${encodeURIComponent(data.app.name)}`)
        .then(res => res.ok ? res.json() : Promise.reject(res))
        .then(result => {
          setContributorHours((prev) => ({ ...prev, [neighbor.slackId]: { loading: false, hours: result.totalHours } }));
        })
        .catch(() => {
          setContributorHours((prev) => ({ ...prev, [neighbor.slackId]: { loading: false, hours: 0 } }));
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.app?.neighbors, data?.app?.name]);

  const contributorName = contributorData?.neighbor?.fullName || contributorData?.neighbor?.slackFullName || contributor;
  const contributorPfp = contributorData?.neighbor?.pfp;

  const breadcrumbItems = [
    { label: "Adventure Time", href: "/" },
    { label: "Neighborhood", href: "/neighborhood" },
    { 
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          {contributorPfp && (
            <img
              src={contributorPfp}
              alt="pfp"
              style={{ width: 16, height: 16, borderRadius: '4px', marginRight: 6, border: '2px solid #fff', boxShadow: '0 0 0 1px #ccc' }}
            />
          )}
          {contributorName}
        </span>
      ), 
      href: `/neighborhood/${contributor}` 
    },
    { label: data?.app?.name || "Loading...", href: `/neighborhood/${contributor}/${app}` }
  ];

  return (
    <>
      <Head>
        <title>{data?.app?.name || "Loading..."} - Adventure Time</title>
        <meta name="description" content={data?.app?.description || ""} />
      </Head>
      <div>
        <Breadcrumbs items={breadcrumbItems} />
        
        {loading && <p>Loading...</p>}
        {error && <p>{error}</p>}
        
        {!loading && !error && data && (
          <>
            <h1>{data.app.name}</h1>
            {/* Contributors section */}
            {Array.isArray(data.app.neighbors) && data.app.neighbors.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <strong>Contributors:</strong>
                <ul style={{ display: 'flex', flexWrap: 'wrap', gap: 12, listStyle: 'none', padding: 0, margin: '8px 0 0 0' }}>
                  {data.app.neighbors.map((neighbor) => {
                    const hoursObj = contributorHours[neighbor.slackId];
                    return (
                      <li key={neighbor.id}>
                        <Link href={`/neighborhood/${neighbor.slackId}/${encodeURIComponent(data.app.name)}`} style={{ textDecoration: 'underline', color: '#0070f3' }}>
                          {neighbor.fullName || neighbor.slackId || 'unnamed'}
                        </Link>
                        {hoursObj?.loading ? (
                          <span> (loading total hours)</span>
                        ) : (
                          <span> ({hoursObj?.hours || 0} hr)</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <p>{data.app.description}</p>
            <h2>Hackatime Projects</h2>
            {projects.length > 0 ? (
              <ul>
                {projects.map((project) => {
                  const details = projectDetails[project.id];
                  let totalDuration = null;
                  if (details?.data?.spans && Array.isArray(details.data.spans)) {
                    totalDuration = details.data.spans.reduce((sum, entry) => sum + (entry.duration || 0), 0);
                  }
                  let totalHours = null;
                  if (typeof totalDuration === 'number') {
                    totalHours = (totalDuration / 3600).toFixed(1);
                  }
                  return (
                    <li key={project.id}>
                      <strong>{project.name}</strong>
                      {project.githubUsername && project.githubLink ? (
                        (() => {
                          // Try to extract repo from githubLink
                          const match = project.githubLink.match(/github\.com\/([^\/]+)\/([^\/]+)/);
                          if (match) {
                            const repo = match[2];
                            return (
                              <span> (<a href={`https://github.com/${project.githubUsername}/${repo}/commits/main/?author=${project.githubUsername}`} target="_blank" rel="noopener noreferrer">Github Commits by @{project.githubUsername}</a>)</span>
                            );
                          }
                          // fallback to just githubLink
                          return (
                            <span> (<a href={project.githubLink} target="_blank" rel="noopener noreferrer">github</a>)</span>
                          );
                        })()
                      ) : project.githubLink && (
                        <span> (<a href={project.githubLink} target="_blank" rel="noopener noreferrer">github</a>)</span>
                      )}
                      {typeof totalHours === 'string' && (
                        <span> ({totalHours} hr logged)</span>
                      )}
                      {project.description && <span>: {project.description}</span>}
                      {details?.loading && (
                        <span> (loading hackatime data...)</span>
                      )}
                      {details?.error && (
                        <span style={{ color: 'red' }}> (error loading hackatime data)</span>
                      )}
                      {/* Optionally, display the raw data for debugging */}
                      {/*details?.data && (
                        <pre style={{ fontSize: '0.8em', marginTop: 4 }}>{JSON.stringify(details.data, null, 2)}</pre>
                      )*/}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p>No hackatime projects found for this user and app.</p>
            )}
            <h2>Devlogs</h2>
            {posts.length > 0 ? (
              <ul>
                {(() => {
                  // Gather all spans from all projectDetails
                  let allSpans = [];
                  projects.forEach((project) => {
                    const details = projectDetails[project.id];
                    if (details?.data?.spans && Array.isArray(details.data.spans)) {
                      allSpans = allSpans.concat(details.data.spans);
                    }
                  });
                  // Sort allSpans by end_time
                  allSpans.sort((a, b) => a.end_time - b.end_time);

                  // Sort posts by createdAt
                  const sortedPosts = [...posts].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

                  let lastEnd = -Infinity;
                  let usedSpanIds = new Set();
                  let cumulativeDuration = 0;
                  const postEls = sortedPosts.map((post, idx) => {
                    const postEnd = new Date(post.createdAt).getTime() / 1000;
                    const postStart = idx > 0 ? new Date(sortedPosts[idx - 1].createdAt).getTime() / 1000 : -Infinity;
                    // Sum durations of spans that end in this window
                    let totalDuration = 0;
                    allSpans.forEach((span, i) => {
                      if (
                        span.end_time > postStart &&
                        span.end_time <= postEnd &&
                        !usedSpanIds.has(i)
                      ) {
                        totalDuration += span.duration || 0;
                        usedSpanIds.add(i);
                      }
                    });
                    cumulativeDuration += totalDuration;
                    const totalHours = (totalDuration / 3600).toFixed(1);
                    const cumulativeHours = (cumulativeDuration / 3600).toFixed(1);
                    const dateTitle = post.createdAt ? new Date(post.createdAt).toLocaleString() : "Untitled";
                    return (
                      <li key={post.id} style={{ marginBottom: 24 }}>
                        <p>{cumulativeHours} Logged Hours (+{totalHours})</p>
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
                        {post.content && <div>{post.content}</div>}
                        <strong>{dateTitle}</strong>
                      </li>
                    );
                  });
                  // Calculate unposted time
                  const lastPostEnd = sortedPosts.length > 0 ? new Date(sortedPosts[sortedPosts.length - 1].createdAt).getTime() / 1000 : -Infinity;
                  let unpostedTime = 0;
                  allSpans.forEach((span, i) => {
                    if (span.end_time > lastPostEnd && !usedSpanIds.has(i)) {
                      unpostedTime += span.duration || 0;
                      usedSpanIds.add(i);
                    }
                  });
                  if (unpostedTime > 0) {
                    postEls.push(
                      <li key="unpostedTime" style={{ marginBottom: 24 }}>
                        <p>{(unpostedTime / 3600).toFixed(1)} hours unposted</p>
                      </li>
                    );
                  }
                  return postEls;
                })()}
              </ul>
            ) : (
              <p>No devlogs found for this user and app.</p>
            )}
          </>
        )}
      </div>
    </>
  );
}

/* Add this CSS to your global styles or in a <style jsx global> block */
/*
.video-hover-controls video::-webkit-media-controls {
  opacity: 0;
  transition: opacity 0.2s;
}
.video-hover-controls:hover video::-webkit-media-controls {
  opacity: 1;
}
.video-hover-controls video {
  outline: none;
}
*/

// For cross-browser, you may need to use a JS workaround to toggle controls attribute on hover.
// If you want, I can implement a React state-based hover solution for full compatibility. 