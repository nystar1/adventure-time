import Head from "next/head";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function Review() {
  const [hasToken, setHasToken] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pfp, setPfp] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    setHasToken(!!token);
    fetchTasks(token);
    fetchPfp(token);
  }, []);

  const fetchTasks = async (token) => {
    try {
      const response = await fetch(`/api/getReviewTaskList?token=${token}`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const data = await response.json();
      setTasks(data.tasks);
    } catch (err) {
      setError('Failed to load review tasks');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

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
      // ignore
    }
  };

  return (
    <>
      <Head>
        <title>Review - Adventure Time</title>
        <meta name="description" content="Review submissions" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚔️</text></svg>" />
      </Head>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div>
          <p>Review</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {hasToken && (
            <>
              <Link href="/">Exit Review</Link>
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

      <div style={{ padding: '0px' }}>
        {loading ? (
          <p>Loading review tasks...</p>
        ) : error ? (
          <p style={{ color: 'red' }}>{error}</p>
        ) : tasks.length === 0 ? (
          <p>No review tasks assigned.</p>
        ) : (
          <ul style={{ padding: 0, margin: 0 }}>
            {tasks.map(task => (
              <li key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={!!task.isComplete}
                  disabled={!task.isComplete}
                  style={{ 
                    width: 18, 
                    height: 18, 
                    accentColor: task.isComplete ? undefined : '#9CA3AF', 
                    cursor: task.isComplete ? 'default' : 'not-allowed' 
                  }}
                />
                <Link href={`/review/${task.id}`} style={{ textDecoration: 'underline', color: '#0070f3' }}>
                  {task.projectName}
                  {' ('}
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                    {task.slackPfp && (
                      <img
                        src={task.slackPfp}
                        alt="pfp"
                        style={{ width: 16, height: 16, borderRadius: '4px', border: '2px solid #fff', boxShadow: '0 0 0 1px #ccc' }}
                      />
                    )}
                    {task.slackHandle && `@${task.slackHandle}`}
                  </span>
                  {')'}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
} 