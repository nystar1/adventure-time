import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function YSWSCenter() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortType, setSortType] = useState('status');

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const response = await fetch('/api/getYSWSSubmissions');
        const data = await response.json();
        setSubmissions(data.submissions);
      } catch (err) {
        setError('Failed to load YSWS submissions');
        console.error('Error fetching YSWS submissions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, []);

  // Group submissions by Code URL
  const groupedSubmissions = submissions.reduce((groups, submission) => {
    const codeUrl = submission.codeUrl || 'No Code URL';
    if (!groups[codeUrl]) {
      groups[codeUrl] = [];
    }
    groups[codeUrl].push(submission);
    return groups;
  }, {});

  // Convert grouped submissions to array for sorting
  const projectGroups = Object.entries(groupedSubmissions).map(([codeUrl, groupSubmissions]) => {
    // Use the first submission for project details
    const primarySubmission = groupSubmissions[0];
    return {
      codeUrl,
      playableUrl: primarySubmission.playableUrl,
      status: primarySubmission.status,
      description: primarySubmission.description,
      screenshot: primarySubmission.screenshot,
      contributors: groupSubmissions.map(sub => ({
        id: sub.id,
        firstName: sub.firstName,
        lastName: sub.lastName,
        slackId: Array.isArray(sub.slackId) ? sub.slackId[0] : sub.slackId,
        pfpUrl: Array.isArray(sub.Pfp) && sub.Pfp.length > 0 ? sub.Pfp[0].url : null,
        githubUsername: sub.githubUsername
      }))
    };
  });

  const sortedProjects = [...projectGroups].sort((a, b) => {
    if (sortType === 'status') {
      return a.status?.localeCompare(b.status || '');
    } else if (sortType === 'contributors') {
      return b.contributors.length - a.contributors.length;
    }
    return 0;
  });

  const breadcrumbItems = [
    { label: "Adventure Time", href: "/" },
    { label: "Neighborhood", href: "/neighborhood" },
    { label: "YSWS DB Center", href: "/neighborhood/ysws-center" }
  ];

  return (
    <>
      <Head>
        <title>The YSWS DB Center - Adventure Time</title>
        <meta name="description" content="YSWS Database Center" />
      </Head>
      <div>
        <Breadcrumbs items={breadcrumbItems} />
        <h1>The YSWS DB Center</h1>
        <p>
          This is the place where all the ships go and you can see the status, 
          what ultimately ends up in the DB, and links to their adventure time profiles.
        </p>
        
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="sortType">Sort by: </label>
          <select
            id="sortType"
            value={sortType}
            onChange={e => setSortType(e.target.value)}
          >
            <option value="status">Status</option>
            <option value="contributors">Most Contributors</option>
          </select>
        </div>
        
        {loading && <p>Loading submissions...</p>}
        {error && <p>{error}</p>}
        
        {!loading && !error && (
          <ol style={{ paddingLeft: '20px' }}>
            {sortedProjects.map((project) => (
              <li key={project.codeUrl} style={{ marginBottom: '16px' }}>
                <div>
                  <strong>
                    {project.codeUrl !== 'No Code URL' ? (
                      <a href={project.codeUrl} target="_blank" rel="noopener noreferrer">
                        {project.codeUrl.replace(/^https?:\/\/(www\.)?github\.com\//, '')}
                      </a>
                    ) : (
                      'No Code URL'
                    )}
                  </strong>
                  {' '}
                  <span>(
                    {project.contributors.map((contributor, index) => (
                      <span key={contributor.id} style={{ display: 'inline-flex', alignItems: 'center' }}>
                        {index > 0 && ', '}
                        {contributor.pfpUrl && (
                          <img 
                            src={contributor.pfpUrl} 
                            alt={`${contributor.firstName}'s profile`} 
                            style={{ width: 16, height: 16, borderRadius: '4px', border: '1px solid #fff', boxShadow: '0 0 0 1px #ccc', marginRight: '4px', verticalAlign: 'middle' }} 
                          />
                        )}
                        {contributor.slackId && (
                          <Link href={`/neighborhood/${contributor.slackId}/${encodeURIComponent(project.codeUrl.split('/').pop())}`}>
                            {contributor.firstName}
                          </Link>
                        )}
                      </span>
                    ))}
                  )</span>
                  {' - '}
                  <span>{project.status}</span>
                </div>
                <div style={{ marginTop: '4px', marginLeft: '0px', fontSize: '0.9em' }}>
                  {project.description && <p style={{ margin: '4px 0' }}>{project.description}</p>}
                  {project.playableUrl && (
                    <div style={{ margin: '4px 0' }}>
                      <a href={project.playableUrl} target="_blank" rel="noopener noreferrer">
                        {project.playableUrl}
                      </a>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
} 