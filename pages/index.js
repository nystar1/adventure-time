import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import styles from "@/styles/Home.module.css";
import { useEffect, useState } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function Home() {
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    setHasToken(!!token);
  }, []);

  return (
    <>
      <Head>
        <title>Adventure Time</title>
        <meta name="description" content="see who is building in hack club adventures" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚔️</text></svg>" />
      </Head>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
      <div>
        <p>Adventures</p>
        <span>Neighborhood (<Link href="/neighborhood">Leaderboard</Link>) (<Link href="/neighborhood/in-person">In-person Weekly</Link>) (<Link href="/neighborhood/feed">Feed</Link>) (<Link href="/neighborhood/globe">Globe</Link>)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {hasToken ? (
            <>
              <a href="/review">Review</a>
              <a href="/logTime" style={{ marginLeft: '8px' }}>Logger</a>
              <div style={{ 
                width: '24px', 
                height: '24px', 
                backgroundColor: '#9CA3AF',
                borderRadius: '4px',
                border: '2px solid #fff',
                boxShadow: '0 0 0 1px #ccc'
              }}></div>
            </>
          ) : (
            <Link href="/login">Login</Link>
          )}
        </div>
      </div>
    </>
  );
}
