import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function ContributorPage() {
  const router = useRouter();
  const { contributor } = router.query;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [appHours, setAppHours] = useState({});

  useEffect(() => {
    const fetchNeighborDetails = async () => {
      if (!contributor) return;

      try {
        const response = await fetch(`/api/getNeighborDetails?slackId=${contributor}`);
        if (!response.ok) {
          throw new Error('Failed to fetch neighbor details');
        }
        const data = await response.json();
        setData(data);
      } catch (err) {
        setError('Failed to load neighbor details');
        console.error('Error fetching neighbor details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNeighborDetails();
  }, [contributor]);

  useEffect(() => {
    if (!data?.apps) return;
    data.apps.forEach((app) => {
      if (appHours[app.name] !== undefined) return;
      setAppHours((prev) => ({ ...prev, [app.name]: { loading: true } }));
      fetch(`/api/getTotalHoursForProjectSpecificUser?slackId=${contributor}&appName=${encodeURIComponent(app.name)}`)
        .then(res => res.ok ? res.json() : Promise.reject(res))
        .then(result => {
          setAppHours((prev) => ({ ...prev, [app.name]: { loading: false, hours: result.totalHours } }));
        })
        .catch(() => {
          setAppHours((prev) => ({ ...prev, [app.name]: { loading: false, hours: 0 } }));
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.apps]);

  const contributorPfp = data?.neighbor?.pfp;
  const contributorName = data?.neighbor?.fullName || data?.neighbor?.slackFullName || contributor || "Loading...";

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
    }
  ];

  return (
    <>
      <Head>
        <title>{data?.neighbor?.fullName || data?.neighbor?.slackFullName || contributor} - Adventure Time</title>
        <meta name="description" content={`View details for ${data?.neighbor?.fullName || data?.neighbor?.slackFullName || contributor}`} />
      </Head>
      <div>
        <Breadcrumbs items={breadcrumbItems} />
        
        {loading && <p>Loading...</p>}
        {error && <p>{error}</p>}
        
        {!loading && !error && data && (
          <>
            <h1>{data.neighbor.fullName || data.neighbor.slackFullName || "unnamed"}</h1>
            <p>Hackatime Hours: {data.neighbor.totalTimeHackatimeHours}hr</p>
            
            <h2>Apps</h2>
            {data.apps.length > 0 ? (
              <ol>
                {data.apps.map((app) => {
                  const hoursObj = appHours[app.name];
                  return (
                    <li key={app.id}>
                      <Link href={`/neighborhood/${contributor}/${encodeURIComponent(app.name)}`}>
                        {app.name}
                      </Link>
                      {hoursObj?.loading ? (
                        <span> (loading total hours)</span>
                      ) : (
                        <span> ({hoursObj?.hours || 0} hr)</span>
                      )}
                      {" "}({app.memberCount} members)
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p>No apps yet</p>
            )}
          </>
        )}
      </div>
    </>
  );
} 