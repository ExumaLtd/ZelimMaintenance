import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="form-scope">
      <Head>
        <title>Page Not Found | Zelim Maintenance Portal</title>
      </Head>

      <div className="swift-main-layout-wrapper">
        <div className="complete-page-wrapper">
          <div className="complete-card">
            <h1 className="complete-title">404 – Page Not Found</h1>
            <p className="complete-text">The page you&apos;re looking for doesn&apos;t exist.</p>

            <Link href="/" className="return-dashboard-btn">
              <span className="left">Return to login</span>
              <span className="right">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M10.1458 7.5L0 7.5L0 5.83333L10.1458 5.83333L5.47917 1.16667L6.66667 0L13.3333 6.66667L6.66667 13.3333L5.47917 12.1667L10.1458 7.5Z" fill="#172F36"/>
                </svg>
              </span>
            </Link>
          </div>
        </div>

        <footer className="footer-section">
          <a href="https://www.zelim.com" target="_blank" rel="noopener noreferrer">
            <Image src="/logo/zelim-logo.svg" width={120} height={40} alt="Zelim logo" />
          </a>
        </footer>
      </div>
    </div>
  );
}
