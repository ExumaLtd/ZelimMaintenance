import Head from 'next/head';
import Link from 'next/link';

export default function NotFound() {
  return (
    <>
      <Head>
        <title>Page Not Found – Zelim Maintenance Portal</title>
      </Head>
      <div className="landing-scope" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', textAlign: 'center', padding: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 600 }}>404 – Page Not Found</h1>
        <p style={{ color: '#bdc4c6' }}>The page you're looking for doesn't exist.</p>
        <Link href="/" style={{ color: '#bdc4c6', textDecoration: 'underline' }}>Return to login</Link>
      </div>
    </>
  );
}
