import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
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
  const [moleStatus, setMoleStatus] = useState(null);
  const [moleLoading, setMoleLoading] = useState(false);
  const [moleError, setMoleError] = useState(null);
  const [ships, setShips] = useState([]);
  const [commits, setCommits] = useState([]);
  const [commitsLoading, setCommitsLoading] = useState(true);
  const moleIntervalRef = useRef(null);

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
    const fetchCommits = async () => {
      if (!contributor || !app) return;
      const appName = decodeURIComponent(app);
      
      try {
        setCommitsLoading(true);
        const response = await fetch(`/api/getNeighborCommits?slackId=${contributor}&appName=${encodeURIComponent(appName)}`);
        if (!response.ok) {
          throw new Error('Failed to fetch commits');
        }
        const data = await response.json();
        setCommits(data.commits || []);
      } catch (err) {
        console.error('Error fetching commits:', err);
      } finally {
        setCommitsLoading(false);
      }
    };
    
    fetchCommits();
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

    // Fetch Ships data if we have contributor data and github link
    console.log("DEBUG ships", {
      contributor: contributor,
      projects,
      githubLink: projects.find(p => p.githubLink)?.githubLink
    });
    if (projects.length > 0) {
      const githubLink = projects.find(p => p.githubLink)?.githubLink;
      if (githubLink) {
        fetch(`/api/getAppShips?slackId=${encodeURIComponent(contributor)}&githubLink=${encodeURIComponent(githubLink)}`)
          .then(res => res.ok ? res.json() : Promise.reject(res))
          .then(data => {
            setShips(data.ships || []);
          })
          .catch(() => setShips([]));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, contributor, app, contributorData]);

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

  const formatHoursToHoursMinutes = (hours) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  };

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

  // Compute the link to display and use for appLink
  let finalLink = null;
  if (data?.app?.appLink) {
    finalLink = data.app.appLink;
  } else if (data?.app?.playableURL && data.app.playableURL !== "") {
    if (Array.isArray(data.app.playableURL)) {
      finalLink = data.app.playableURL.filter(Boolean).at(-1)?.trim();
    } else if (typeof data.app.playableURL === 'string') {
      finalLink = data.app.playableURL.split(/,\s*/).filter(Boolean).at(-1)?.trim();
    }
  }

  const adventureTimeLink = `https://adventure-time.hackclub.dev/neighborhood/${contributor}/${encodeURIComponent(app)}`;

  const handleMoleTest = async () => {
    setMoleStatus(null);
    setMoleError(null);
    setMoleLoading(true);
    // Use the displayed link as appLink
    let appLink = finalLink;
    console.log('DEBUG: appLink', appLink);
    console.log('DEBUG: projects', projects);
    let githubUrl = projects.find(p => p.githubLink)?.githubLink || appLink;
    console.log('DEBUG: selected githubUrl', githubUrl);
    if (!githubUrl) {
      setMoleError(`Missing githubUrl.\nappLink: ${appLink}\ngithubUrl: ${githubUrl}\nprojects: ${JSON.stringify(projects, null, 2)}`);
      setMoleLoading(false);
      return;
    }
    try {
      const createRes = await fetch("/api/moleCreate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appLink, githubUrl, readmeUrl: adventureTimeLink })
      });
      if (!createRes.ok) throw new Error("Failed to create mole record");
      const { record_id } = await createRes.json();
      setMoleStatus({ record_id, ai_guess: null, ai_reasoning: null });
      // Start polling
      if (moleIntervalRef.current) clearInterval(moleIntervalRef.current);
      moleIntervalRef.current = setInterval(async () => {
        try {
          const testRes = await fetch(`/api/moleTest?record_id=${record_id}`);
          if (!testRes.ok) throw new Error("Failed to fetch mole test");
          const { fields } = await testRes.json();
          setMoleStatus((prev) => ({ ...prev, ai_guess: fields.ai_guess, ai_reasoning: fields.ai_reasoning }));
          // Stop polling if ai_guess is not null
          if (fields.ai_guess !== undefined && fields.ai_guess !== null) {
            clearInterval(moleIntervalRef.current);
            setMoleLoading(false);
          }
        } catch (err) {
          setMoleError("Error polling mole test");
          clearInterval(moleIntervalRef.current);
          setMoleLoading(false);
        }
      }, 5000);
    } catch (err) {
      setMoleError("Error creating mole record");
      setMoleLoading(false);
    }
  };

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (moleIntervalRef.current) clearInterval(moleIntervalRef.current);
    };
  }, []);

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
            {/* App Link and Mole Test Button */}
            {finalLink && (
              <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <a
                  href={finalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0070f3', textDecoration: 'underline' }}
                >
                  {finalLink}
                </a>
                <button onClick={handleMoleTest} disabled={moleLoading}>{moleLoading ? 'Loading...' : '𝓂𝑜𝓁𝑒'}</button>
                {moleError && <span style={{ color: 'red', marginLeft: 8 }}>{moleError}</span>}
                {moleStatus && moleStatus.ai_guess !== undefined && moleStatus.ai_guess !== null && (
                  <div style={{ marginTop: 8 }}>
                    <div><strong>AI Guess:</strong> {String(moleStatus.ai_guess)}</div>
                    <div><strong>AI Reasoning:</strong> {moleStatus.ai_reasoning}</div>
                  </div>
                )}
              </div>
            )}
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
                          const repoUsername = match[1];
                          if (match) {
                            const repo = match[2];
                            return (
                              <span> (<a href={`https://github.com/${repoUsername}/${repo}/commits/?author=${project.githubUsername}`} target="_blank" rel="noopener noreferrer">Github Commits by @{project.githubUsername}</a>)</span>
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
            {(posts.length > 0 || ships.length > 0) ? (
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

                  // Merge posts and ships into a single timeline
                  const timeline = [
                    ...posts.map(post => ({ ...post, _type: 'post' })),
                    ...ships.map(ship => ({ ...ship, _type: 'ship' }))
                  ].filter(item => item.createdAt).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

                  let lastEnd = -Infinity;
                  let usedSpanIds = new Set();
                  let cumulativeDuration = 0;
                  const timelineEls = timeline.map((item, idx) => {
                    const itemEnd = new Date(item.createdAt).getTime() / 1000;
                    const itemStart = idx > 0 ? new Date(timeline[idx - 1].createdAt).getTime() / 1000 : -Infinity;
                    // Sum durations of spans that end in this window
                    let totalDuration = 0;
                    allSpans.forEach((span, i) => {
                      if (
                        span.end_time > itemStart &&
                        span.end_time <= itemEnd &&
                        !usedSpanIds.has(i)
                      ) {
                        totalDuration += span.duration || 0;
                        usedSpanIds.add(i);
                      }
                    });
                    cumulativeDuration += totalDuration;
                    const totalHours = (totalDuration / 3600).toFixed(1);
                    const cumulativeHours = (cumulativeDuration / 3600).toFixed(1);
                    const dateTitle = item.createdAt ? new Date(item.createdAt).toLocaleString() : "Untitled";
                    if (item._type === 'post') {
                      return (
                        <li key={item.id} style={{ marginBottom: 24 }}>
                          <p>{cumulativeHours} Logged Hours (+{totalHours})</p>
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
                          {item.content && <div>{item.content}</div>}
                          <div style={{ marginTop: '8px', fontSize: '0.9em', color: '#666' }}>
                            <div>Review Status: {item.review_status || 'pending'}</div>
                            {item.approved_time_hours && (
                              <div>Approved Hours: {formatHoursToHoursMinutes(item.approved_time_hours)}</div>
                            )}
                            {item.review_comment && (
                              <div>Review Comment: {item.review_comment}</div>
                            )}
                          </div>
                          <strong>{dateTitle}</strong>
                        </li>
                      );
                    } else if (item._type === 'ship') {
                      // Find the index of this ship among all ships in the timeline
                      const shipTimelineIndex = timeline.filter(t => t._type === 'ship' && new Date(t.createdAt) <= new Date(item.createdAt)).indexOf(item);
                      const releaseLabel = shipTimelineIndex === 0 ? 'Release 1.0' : `Release 1.${shipTimelineIndex}`;
                      const appName = data?.app?.name || '';
                      return (
                        <li key={item.id} style={{ marginBottom: 24 }}>
                          <p style={{ fontWeight: 600 }}>{appName} ({releaseLabel})</p>
                          {item.changesMade && (
                            <p>{item.changesMade}</p>
                          )}
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
                          <strong>{dateTitle}</strong>
                        </li>
                      );
                    }
                    return null;
                  });
                  // Calculate unposted time
                  const lastTimelineEnd = timeline.length > 0 ? new Date(timeline[timeline.length - 1].createdAt).getTime() / 1000 : -Infinity;
                  let unpostedTime = 0;
                  allSpans.forEach((span, i) => {
                    if (span.end_time > lastTimelineEnd && !usedSpanIds.has(i)) {
                      unpostedTime += span.duration || 0;
                      usedSpanIds.add(i);
                    }
                  });
                  if (unpostedTime > 0) {
                    timelineEls.push(
                      <li key="unpostedTime" style={{ marginBottom: 24 }}>
                        <p>{(unpostedTime / 3600).toFixed(1)} hours unposted</p>
                      </li>
                    );
                  }
                  return timelineEls;
                })()}
              </ul>
            ) : (
              <p>No devlogs or ships found for this user and app.</p>
            )}

<h2>Stopwatch Sessions</h2>
            {commitsLoading ? (
              <p>Loading stopwatch sessions...</p>
            ) : commits.length > 0 ? (
              <>
                {(() => {
                  // Calculate total duration from all commits
                  const totalMinutes = commits.reduce((total, commit) => total + (commit.duration[0] || 0), 0);
                  const totalHours = (totalMinutes / 60).toFixed(1);
                  
                  return (
                    <p style={{ fontSize: '0.9rem', color: '#666', maxWidth: '600px', marginBottom: '16px' }}>
                      This user logged <strong>{totalHours} hours</strong> in stopwatch which is subject to scrutiny and may or may not be approved (up to reviewer)
                    </p>
                  );
                })()}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {commits.slice().reverse().map(commit => (
                    <div key={commit.commitId} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {commit.videoLink && (
                        <div>
                          <video 
                            controls 
                            src={commit.videoLink} 
                            style={{ maxWidth: 175, maxHeight: '300px' }}
                          />
                        </div>
                      )}
                      <div>
                        <p style={{ margin: '4px 0' }}>{commit.message}</p>
                        <p style={{ margin: '4px 0', fontSize: '0.9rem', color: '#666' }}>
                          {new Date(commit.commitTime).toLocaleString()} • {commit.duration} minutes
                        </p>
                        {commit.reviewComment && (
                          <p style={{ margin: '4px 0', fontStyle: 'normal', color: '#888' }}>
                            Reviewer Comment: {commit.reviewComment}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p>No stopwatch sessions found</p>
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
