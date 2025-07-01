import Head from "next/head";
import { useEffect, useState } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function FreedomWeekVideos() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/freedomWeekVideos");
        if (!response.ok) throw new Error("Failed to fetch videos");
        const data = await response.json();
        setVideos(data.videos || []);
        setLoading(false);
      } catch (err) {
        setError("Failed to load videos");
        setLoading(false);
      }
    };
    fetchVideos();
  }, []);

  const breadcrumbItems = [
    { label: "Adventure Time", href: "/" },
    { label: "Freedom Week Videos", href: "/freedomWeekVideos" }
  ];

  // Helper to embed YouTube or fallback to link
  const renderVideo = (url) => {
    if (!url) return null;
    const youtubeMatch = url.match(/(?:youtu.be\/|youtube.com\/(?:embed\/|v\/|watch\?v=))([\w-]{11})/);
    if (youtubeMatch) {
      const videoId = youtubeMatch[1];
      return (
        <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', height: 0, marginBottom: 8 }}>
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: 8 }}
          />
        </div>
      );
    }
    // Try to embed as a video
    return (
      <div>
        <video src={url} controls style={{ width: '100%', maxWidth: 480, borderRadius: 8, marginBottom: 8, background: '#000' }}>
          Your browser does not support the video tag.
        </video>
        <div>
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#0070f3', textDecoration: 'underline' }}>Open Video</a>
        </div>
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>Freedom Week Videos - Adventure Time</title>
        <meta name="description" content="View Freedom Week videos and participants" />
      </Head>
      <div style={{ background: '#f9fafb', minHeight: '100vh', padding: '32px 0' }}>
        <Breadcrumbs items={breadcrumbItems} />
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: '24px 0 32px 0', letterSpacing: -1 }}>
          Freedom Week Videos
          {videos.length > 0 && (
            <span style={{ fontSize: 16, fontWeight: 400, color: '#666', marginLeft: 12 }}>
              (refreshes every 5 minutes)
            </span>
          )}
        </h1>
        {loading && <p>Loading videos...</p>}
        {error && <p>{error}</p>}
        {!loading && !error && (
          <>
            {videos.length === 0 ? (
              <p>No videos found.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, maxWidth: 600, margin: '0 auto' }}>
                {videos.map((video, idx) => (
                  <li
                    key={video.recordId}
                    style={{
                      marginBottom: 32,
                      background: '#fff',
                      border: '1px solid #eee',
                      borderRadius: 12,
                      padding: 20,
                      boxShadow: '0 2px 12px 0 rgba(0,0,0,0.04)',
                      transition: 'box-shadow 0.2s',
                      position: 'relative',
                      ...(idx !== videos.length - 1 ? { boxShadow: '0 2px 12px 0 rgba(0,0,0,0.06)' } : {})
                    }}
                    onMouseOver={e => e.currentTarget.style.boxShadow = '0 4px 24px 0 rgba(0,0,0,0.10)'}
                    onMouseOut={e => e.currentTarget.style.boxShadow = '0 2px 12px 0 rgba(0,0,0,0.06)'}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 18, color: '#222' }}>
                      <span style={{ color: '#555', fontWeight: 500, fontSize: 15 }}>Participants:</span> {video.participants.join(' & ')}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                      {renderVideo(video.videoUrl)}
                    </div>
                    {idx !== videos.length - 1 && (
                      <hr style={{ border: 0, borderTop: '1px solid #f0f0f0', margin: '24px 0 0 0' }} />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </>
  );
}
