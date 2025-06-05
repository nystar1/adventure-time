import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import Breadcrumbs from '@/components/Breadcrumbs';

const questions = [
  {
    label: 'Does the project link and github link work? Can you run the app?',
    type: 'radio',
    options: ['Yes', 'No'],
    name: 'linksWork',
    followupName: 'linksWorkDetails',
    followupLabel: "If no, please specify how the link isn't working for you.",
  },
  {
    label: 'Are all features working / complete?',
    type: 'radio',
    options: ['Yes', 'No'],
    name: 'featuresComplete',
    followupName: 'featuresCompleteDetails',
    followupLabel: 'If no, please specify what features are not working.',
  },
  {
    label: 'Approve / Reject each devlog based on git commits, devlog, and time spent',
    type: 'button',
    options: ["I'm Done"],
    name: 'devlogApproval',
  },
  {
    label: 'Is this a high-effort project or is this a low-effort project?',
    type: 'radio',
    options: ['high-effort', 'low-effort'],
    name: 'effortLevel',
    followupName: 'effortLevelDetails',
    followupLabel: (value) => value === 'high-effort' ? 'What makes this project high-effort?' : 'What makes this project low-effort?',
  },
  {
    label: 'What feedback do you have for the creator?',
    type: 'text',
    name: 'feedback',
  },
  {
    label: 'How many stars would you rate this project (out of 5)?',
    type: 'stars',
    name: 'starRating',
  },
];

const DEVLOG_STEP_INDEX = questions.findIndex(q => q.name === 'devlogApproval');

export default function ReviewRecordPage() {
  const router = useRouter();
  const { reviewRecordId } = router.query;
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [completed, setCompleted] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // State for left half (copied from [contributor]/[app].js)
  const [contributor, setContributor] = useState(null);
  const [app, setApp] = useState(null);
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
  const moleIntervalRef = useRef(null);
  const [neighborSlackId, setNeighborSlackId] = useState(null);
  const [devlogStatuses, setDevlogStatuses] = useState({});

  // Fetch contributor/app from review assignment
  useEffect(() => {
    if (!reviewRecordId) return;
    fetch(`/api/getReviewAppDetails?reviewRecordId=${reviewRecordId}`)
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(({ contributor, app, neighborSlackId }) => {
        setContributor(contributor);
        setApp(app);
        setNeighborSlackId(neighborSlackId);
      })
      .catch(() => setError('Failed to load review assignment info'));
  }, [reviewRecordId]);

  // Fetch all app/contributor data (copied from [app].js)
  useEffect(() => {
    if (!neighborSlackId || !app) return;
    const appName = decodeURIComponent(app);
    setLoading(true);
    const fetchDetails = async () => {
      try {
        const [appRes, contributorRes, projectsRes] = await Promise.all([
          fetch(`/api/getAppDetails?slackId=${neighborSlackId}&appId=${encodeURIComponent(appName)}`),
          fetch(`/api/getNeighborDetails?slackId=${neighborSlackId}`),
          fetch(`/api/getAppUserHackatimeProjects?slackId=${neighborSlackId}&appName=${encodeURIComponent(appName)}`)
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
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [neighborSlackId, app]);

  useEffect(() => {
    if (!projects.length || !neighborSlackId) return;
    projects.forEach((project) => {
      if (projectDetails[project.id]) return;
      setProjectDetails(prev => ({ ...prev, [project.id]: { loading: true } }));
      fetch(`/api/getHackatimeProjectData?slackId=${neighborSlackId}&project=${encodeURIComponent(project.name)}`)
        .then(res => res.ok ? res.json() : Promise.reject(res))
        .then(data => {
          setProjectDetails(prev => ({ ...prev, [project.id]: { loading: false, data } }));
        })
        .catch(() => {
          setProjectDetails(prev => ({ ...prev, [project.id]: { loading: false, error: true } }));
        });
    });
    fetch(`/api/getAppUserPosts?slackId=${neighborSlackId}&appName=${encodeURIComponent(decodeURIComponent(app))}`)
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => {
        setPosts(data.posts || []);
      })
      .catch(() => setPosts([]));
    if (projects.length > 0) {
      const githubLink = projects.find(p => p.githubLink)?.githubLink;
      if (githubLink) {
        fetch(`/api/getAppShips?slackId=${encodeURIComponent(neighborSlackId)}&githubLink=${encodeURIComponent(githubLink)}`)
          .then(res => res.ok ? res.json() : Promise.reject(res))
          .then(data => {
            setShips(data.ships || []);
          })
          .catch(() => setShips([]));
      }
    }
  }, [projects, neighborSlackId, app, contributorData]);

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
  }, [data?.app?.neighbors, data?.app?.name]);

  const handleRadio = (name, value) => {
    setAnswers(prev => ({ ...prev, [name]: value }));
  };

  const handleText = (name, value) => {
    setAnswers(prev => ({ ...prev, [name]: value }));
  };

  const handleStars = (value) => {
    setAnswers(prev => ({ ...prev, starRating: value }));
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setCompleted(true);
    }
  };

  const handleComplete = async () => {
    setSubmitError(null);
    const reviewerToken = localStorage.getItem('authToken');
    if (!reviewRecordId || !reviewerToken) {
      setSubmitError('Missing review record or reviewer token.');
      return;
    }
    // Map answers to Airtable fields
    // Collect approved and rejected post IDs
    const approvedPosts = Object.entries(devlogStatuses)
      .filter(([_, status]) => status === 'check')
      .map(([postId]) => postId);
    const rejectedPosts = Object.entries(devlogStatuses)
      .filter(([_, status]) => status === 'x')
      .map(([postId]) => postId);
    const payload = {
      reviewRecordId,
      reviewerToken,
      doesLinkWork: answers.linksWork === 'Yes',
      doesLinkWorkComment: answers.linksWork === 'No' ? answers.linksWorkDetails || '' : '',
      doFeaturesWork: answers.featuresComplete === 'Yes',
      doFeaturesWorkComment: answers.featuresComplete === 'No' ? answers.featuresCompleteDetails || '' : '',
      isHighEffort: answers.effortLevel === 'high-effort',
      isHighEffortComment: answers.effortLevelDetails || '',
      feedback: answers.feedback || '',
      numberOfStars: answers.starRating || null,
      isComplete: true,
      approvedPosts,
      rejectedPosts
    };
    try {
      const res = await fetch('/api/updateReviewAssignment', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        setSubmitError(err.message || 'Failed to submit review.');
        return;
      }
      router.push('/review');
    } catch (err) {
      setSubmitError('Failed to submit review.');
    }
  };

  // Helper copied from [app].js
  const formatHoursToHoursMinutes = (hours) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  };

  // Mole test handler copied from [app].js
  const adventureTimeLink = contributor && app
    ? `https://adventure-time.hackclub.dev/neighborhood/${contributor}/${encodeURIComponent(app)}`
    : '';
  const [finalLink, setFinalLink] = useState(null);
  useEffect(() => {
    if (!data?.app) return;
    let link = null;
    if (data.app.appLink) {
      link = data.app.appLink;
    } else if (data.app.playableURL && data.app.playableURL !== "") {
      if (Array.isArray(data.app.playableURL)) {
        link = data.app.playableURL.filter(Boolean).at(-1)?.trim();
      } else if (typeof data.app.playableURL === 'string') {
        link = data.app.playableURL.split(/,\s*/).filter(Boolean).at(-1)?.trim();
      }
    }
    setFinalLink(link);
  }, [data]);

  const handleMoleTest = async () => {
    setMoleStatus(null);
    setMoleError(null);
    setMoleLoading(true);
    let appLink = finalLink;
    let githubUrl = projects.find(p => p.githubLink)?.githubLink || appLink;
    if (!githubUrl) {
      setMoleError(`Missing githubUrl. appLink: ${appLink} githubUrl: ${githubUrl}`);
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
      if (moleIntervalRef.current) clearInterval(moleIntervalRef.current);
      moleIntervalRef.current = setInterval(async () => {
        try {
          const testRes = await fetch(`/api/moleTest?record_id=${record_id}`);
          if (!testRes.ok) throw new Error("Failed to fetch mole test");
          const { fields } = await testRes.json();
          setMoleStatus((prev) => ({ ...prev, ai_guess: fields.ai_guess, ai_reasoning: fields.ai_reasoning }));
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
  useEffect(() => {
    return () => {
      if (moleIntervalRef.current) clearInterval(moleIntervalRef.current);
    };
  }, []);

  const handleDevlogAction = (devlogId, action) => {
    setDevlogStatuses(prev => ({
      ...prev,
      [devlogId]: action
    }));
  };

  return (
    <>
      <Head>
        <style>{`
          html, body {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            width: 100vw;
            height: 100vh;
            overflow: hidden;
          }
        `}</style>
      </Head>
      <div style={{ display: 'flex', flexDirection: 'row', width: '100vw', height: '100vh', margin: 0, padding: 0 }}>
        {/* LEFT HALF: App/Contributor view (copied from [app].js) */}
        <div style={{ flex: 1, marginLeft: 16, height: '100vh', overflowY: 'auto', padding: 0 }}>
          <Breadcrumbs items={(() => {
            const slackHandle = contributorData?.neighbor?.slackHandle || contributor;
            const contributorPfp = contributorData?.neighbor?.pfp;
            return [
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
                    {slackHandle}
                  </span>
                ),
                href: `/neighborhood/${neighborSlackId}`
              },
              { label: data?.app?.name || "Loading...", href: `/neighborhood/${neighborSlackId}/${app}` }
            ];
          })()} />
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
                            const match = project.githubLink.match(/github\.com\/([^\/]+)\/([^\/]+)/);
                            if (match) {
                              const repo = match[2];
                              return (
                                <span> (<a href={`https://github.com/${project.githubUsername}/${repo}/commits/main/?author=${project.githubUsername}`} target="_blank" rel="noopener noreferrer">Github Commits by @{project.githubUsername}</a>)</span>
                              );
                            }
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
                    let allSpans = [];
                    projects.forEach((project) => {
                      const details = projectDetails[project.id];
                      if (details?.data?.spans && Array.isArray(details.data.spans)) {
                        allSpans = allSpans.concat(details.data.spans);
                      }
                    });
                    allSpans.sort((a, b) => a.end_time - b.end_time);
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
                            <p>{cumulativeHours} Logged Hours (+{totalHours}){typeof totalHours === 'string' && !isNaN(Number(totalHours)) ? ` (${totalHours} hr)` : ''}</p>
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
            </>
          )}
        </div>
        {/* RIGHT HALF: Review questions (existing code remains) */}
        <div style={{ flex: 1, height: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', borderLeft: '1px solid #000', overflowY: 'auto' }}>
          <form style={{ width: '100%', background: 'none', padding: 0, borderRadius: 0, boxShadow: 'none', border: 'none' }}>
            {Array.from({ length: completed || currentStep > DEVLOG_STEP_INDEX ? questions.length : currentStep + 1 }).map((_, idx) => {
              const q = questions[idx];
              // Determine if this question is answered
              let isAnswered = false;
              if (q.type === 'radio') {
                isAnswered = !!answers[q.name];
                // If followup is visible, require it too
                if ((q.name === 'linksWork' || q.name === 'featuresComplete') && answers[q.name] === 'No' && q.followupName) {
                  isAnswered = isAnswered && !!answers[q.followupName]?.trim();
                }
              } else if (q.type === 'text') {
                isAnswered = !!answers[q.name]?.trim();
              } else if (q.type === 'stars') {
                isAnswered = !!answers[q.name];
              } else if (q.type === 'button') {
                isAnswered = true;
              }
              // For effortLevel followup
              if (q.name === 'effortLevel' && (answers[q.name] === 'high-effort' || answers[q.name] === 'low-effort')) {
                isAnswered = isAnswered && !!answers[q.followupName]?.trim();
              }
              return (
                <div key={q.name} style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', marginBottom: 8 }}>{q.label}</label>
                  {q.type === 'radio' && (
                    <div>
                      {q.options.map(opt => (
                        <label key={opt} style={{ marginRight: 16 }}>
                          <input
                            type="radio"
                            name={q.name}
                            value={opt}
                            checked={answers[q.name] === opt}
                            onChange={() => handleRadio(q.name, opt)}
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  )}
                  {/* Show followup textarea if answer is No for Q1 or Q2 */}
                  {q.type === 'radio' && answers[q.name] === 'No' && q.followupName && (q.name === 'linksWork' || q.name === 'featuresComplete') && (
                    <div style={{ marginTop: 8 }}>
                      <label style={{ display: 'block', marginBottom: 4 }}>{q.followupLabel}</label>
                      <textarea
                        rows={3}
                        name={q.followupName}
                        value={answers[q.followupName] || ''}
                        onChange={e => handleText(q.followupName, e.target.value)}
                        style={{ width: '100%', maxWidth: "400px", fontSize: '14px', marginBottom: 8 }}
                      />
                    </div>
                  )}
                  {/* Show followup textarea for high-effort/low-effort */}
                  {q.name === 'effortLevel' && (answers[q.name] === 'high-effort' || answers[q.name] === 'low-effort') && (
                    <div style={{ marginTop: 8 }}>
                      <label style={{ display: 'block', marginBottom: 4 }}>{q.followupLabel(answers[q.name])}</label>
                      <textarea
                        rows={3}
                        name={q.followupName}
                        value={answers[q.followupName] || ''}
                        onChange={e => handleText(q.followupName, e.target.value)}
                        style={{ width: '100%', maxWidth: "400px", fontSize: '14px', marginBottom: 8 }}
                      />
                    </div>
                  )}
                  {q.type === 'button' && (
                    <>
                      {/* Devlog review UI for Q3 */}
                      <ul style={{ marginBottom: 16 }}>
                        {posts
                          .slice()
                          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                          .map(post => {
                            const content = post.content || 'Untitled';
                            const truncated = content.length > 50 ? content.substring(0, 50) + '...' : content;
                            let hours = '';
                            if (post.totalHours) {
                              hours = ` (+${post.totalHours} hr)`;
                            }
                            return (
                              <li key={post.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <button
                                  type="button"
                                  onClick={() => handleDevlogAction(post.id, 'check')}
                                  disabled={devlogStatuses[post.id] === 'check'}
                                  title="Approve"
                                  style={devlogStatuses[post.id] === 'check' ? {
                                    background: '#22c55e',
                                    color: '#fff',
                                  } : {}}
                                >
                                  ✔️
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDevlogAction(post.id, 'x')}
                                  disabled={devlogStatuses[post.id] === 'x'}
                                  title="Reject"
                                  style={devlogStatuses[post.id] === 'x' ? {
                                    background: '#ef4444',
                                    color: '#fff',
                                  } : {}}
                                >
                                  ❌
                                </button>
                                <span>
                                  {truncated}{hours}
                                </span>
                              </li>
                            );
                          })}
                      </ul>
                      {currentStep === DEVLOG_STEP_INDEX && (
                        <button type="button" onClick={() => setCurrentStep(questions.length)}>{q.options[0]}</button>
                      )}
                    </>
                  )}
                  {q.type === 'text' && (
                    <textarea
                      rows={4}
                      name={q.name}
                      value={answers[q.name] || ''}
                      onChange={e => handleText(q.name, e.target.value)}
                      style={{ width: '100%', maxWidth: "400px", fontSize: '14px', marginBottom: 8 }}
                      />
                  )}
                  {q.type === 'stars' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {[1,2,3,4,5].map(num => (
                        <span
                          key={num}
                          onClick={() => { handleStars(num); handleNext(); }}
                          style={{
                            fontSize: '2rem',
                            cursor: 'pointer',
                            opacity: answers[q.name] && num <= answers[q.name] ? 1 : 0.3,
                            userSelect: 'none'
                          }}
                          title={`${num} star${num > 1 ? 's' : ''}`}
                        >
                          🌟
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Only show next button for the last visible question and not for button type */}
                  {idx === (completed ? questions.length - 1 : currentStep) && q.type !== 'button' && q.type !== 'text' && q.type !== 'stars' && !completed && isAnswered && (
                    <button type="button" onClick={handleNext}>Next</button>
                  )}
                </div>
              );
            })}
            {completed && (
              <div>
                {submitError && <div style={{ color: 'red', marginBottom: 8 }}>{submitError}</div>}
                <button type="button" onClick={handleComplete}>Complete Review</button>
              </div>
            )}
          </form>
        </div>
      </div>
    </>
  );
} 