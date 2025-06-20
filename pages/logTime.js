import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function LogTime() {
  const [hasToken, setHasToken] = useState(false);
  const [pfp, setPfp] = useState(null);
  const [slackId, setSlackId] = useState(null);
  const [apps, setApps] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [unloggedTime, setUnloggedTime] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isLogging, setIsLogging] = useState(false);
  const [currentTime, setCurrentTime] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [language, setLanguage] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      // Save intended page and redirect to login
      localStorage.setItem('redirectAfterLogin', '/logTime');
      router.replace('/login');
      return;
    }
    setHasToken(true);
    fetchPfp(token);
  }, []);

  useEffect(() => {
    if (slackId) {
      fetchApps(slackId);
    }
  }, [slackId]);

  useEffect(() => {
    if (selectedApp && apps && apps.apps && apps.apps[selectedApp]) {
      setUnloggedTime(apps.apps[selectedApp].unloggedHours);
    } else {
      setUnloggedTime(null);
    }
  }, [selectedApp, apps]);

  useEffect(() => {
    if (selectedApp && slackId) {
      fetchProjects(slackId, selectedApp);
    } else {
      setProjects([]);
    }
  }, [selectedApp, slackId]);

  useEffect(() => {
    if (selectedApp || selectedProject) {
      setIsLogging(false);
    }
  }, [selectedApp, selectedProject]);

  useEffect(() => {
    let interval;
    if (isLogging && unloggedTime) {
      setCurrentTime(parseFloat(unloggedTime));
      interval = setInterval(() => {
        setCurrentTime(prev => prev + 1/3600);
      }, 1000);
    } else {
      setCurrentTime(null);
    }
    return () => clearInterval(interval);
  }, [isLogging, unloggedTime]);

  useEffect(() => {
    let heartbeatInterval;
    if (isLogging && selectedProject) {
      const project = projects.find(p => p.id === selectedProject);
      if (project) {
        heartbeatInterval = setInterval(() => {
          sendHeartbeat(project.name);
        }, 2000);
      }
    }
    return () => clearInterval(heartbeatInterval);
  }, [isLogging, selectedProject, projects]);

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
      setSlackId(data.slackId);
    } catch (err) {
      // ignore
    }
  };

  const fetchApps = async (slackId) => {
    try {
      const response = await fetch(`/api/getUnloggedTimeForUser?slackId=${encodeURIComponent(slackId)}`);
      if (!response.ok) return;
      const data = await response.json();
      setApps(data);
    } catch (err) {
      // ignore
    }
  };

  const fetchProjects = async (slackId, appName) => {
    try {
      const response = await fetch(`/api/getAppUserHackatimeProjects?slackId=${encodeURIComponent(slackId)}&appName=${encodeURIComponent(appName)}`);
      if (!response.ok) return;
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (err) {
      // ignore
    }
  };

  const sendHeartbeat = async (projectName) => {
    if (!apiKey) {
      alert('Please enter your Hackatime API key.');
      return;
    }
    try {
      const response = await fetch('/api/heartbeats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entity: projectName,
          type: 'file',
          time: Math.floor(Date.now() / 1000),
          project: projectName,
          language: language || 'JavaScript',
          hackatimeToken: apiKey,
          is_write: true,
        }),
      });
      if (!response.ok) {
        console.error('Failed to send heartbeat');
      }
    } catch (err) {
      console.error('Error sending heartbeat:', err);
    }
  };

  const testHeartbeat = async () => {
    if (!selectedProject) {
      alert('Please select a project first');
      return;
    }
    if (!apiKey) {
      alert('Please enter your Hackatime API key');
      return;
    }
    const project = projects.find(p => p.id === selectedProject);
    if (!project) {
      alert('Project not found');
      return;
    }
    try {
      const response = await fetch('/api/heartbeats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entity: project.name,
          project: project.name,
          language: language || 'JavaScript',
          hackatimeToken: apiKey,
        }),
      });
      const rawResponse = await response.text();
      console.log('Raw Response:', rawResponse);
      try {
        const data = JSON.parse(rawResponse);
        console.log('Test Heartbeat Response:', data);
        alert('Test Heartbeat sent. Check console for response.');
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError);
        alert('Error parsing response. Check console for details.');
      }
    } catch (err) {
      console.error('Error sending test heartbeat:', err);
      alert('Error sending test heartbeat. Check console for details.');
    }
  };

  const formatTime = (hours) => {
    const totalSeconds = Math.floor(hours * 3600);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div>
          <p>Time Logger</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {hasToken && (
            <>
              <a href="/">Exit Logger</a>
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
      <div>
        {slackId && <p>Slack Id: {slackId}</p>}
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Hackatime API Key</label>
        <input
          type="text"
          placeholder="kd030478-0a06-419c-a076-9ee6886d46e0c"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          required
        />
        {!apiKey && (
          <p style={{ fontSize: '0.9em', color: '#666', marginTop: '4px' }}>
            Get your Hackatime API key from <a href="https://hackatime.hackclub.com/my/wakatime_setup" target="_blank" rel="noopener noreferrer">https://hackatime.hackclub.com/my/wakatime_setup</a>
          </p>
        )}
        <label style={{ display: 'block', marginBottom: '4px', marginTop: '16px', fontWeight: '500' }}>Language</label>
        <input
          type="text"
          placeholder="JavaScript"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          required
        />
        <p style={{ fontSize: '0.9em', color: '#666', marginTop: '4px' }}>
          Language can be Rust or JavaScript or Bash or non-languages like software Figma, GoDot, or something that accurately describes the work you're doing
        </p>
        {!apps ? (
          <p>Loading Apps...</p>
        ) : (
          <div>
            <select value={selectedApp || ''} onChange={(e) => setSelectedApp(e.target.value)}>
              <option value="">Select an app</option>
              {Object.keys(apps.apps || {}).map(app => (
                <option key={app} value={app}>{app}</option>
              ))}
            </select>
            {selectedApp && unloggedTime && (
              <>
                <p>Unlogged Time: {currentTime ? formatTime(currentTime) : unloggedTime} hours</p>
                {parseFloat(unloggedTime) > 4 ? (
                  <p style={{ color: 'red' }}>
                    Unlogged time is time you spend before you make a devlog! You're not able to log more than 4 hours before making a devlog. Go make a devlog in the <a href="https://neighborhood.hackclub.com/desktop">Neighborhood</a> and then you'll be able to use this feature.
                  </p>
                ) : (
                  <div>
                    {isLogging ? (
                      <button onClick={() => setIsLogging(false)}>Stop Logging</button>
                    ) : (
                      <button onClick={() => setIsLogging(true)} disabled={!selectedProject || !apiKey}>Start Logging</button>
                    )}
                    {projects.length === 0 ? (
                      <p>Loading...</p>
                    ) : (
                      <select value={selectedProject || ''} onChange={(e) => setSelectedProject(e.target.value)}>
                        <option value="">Select a Hackatime project</option>
                        {projects.map(project => (
                          <option key={project.id} value={project.id}>{project.name}</option>
                        ))}
                      </select>
                    )}
                    {selectedProject && (
                      <button onClick={testHeartbeat}>Test Heartbeat</button>
                    )}
                    {isLogging && (
                      <div style={{ display: 'flex', justifyContent: 'start', alignItems: 'start' }}>
                        <p style={{ animation: 'pulse 10s infinite', fontSize: 32 }}>❤️ heartbeat sent</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
      <style jsx>{`
        @keyframes pulse {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1); opacity: 1; }
          100% { transform: scale(0); opacity: 0; }
        }
      `}</style>
    </>
  );
} 