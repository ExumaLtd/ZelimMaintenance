import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";

export default function UnscheduledComplete() {
  const router = useRouter();
  const { id } = router.query; 

  return (
    <div className="form-scope">
      <Head>
        <title>Unscheduled Maintenance Complete | Zelim</title>
      </Head>

      <div className="swift-main-layout-wrapper">
        <div className="page-wrapper">
          <div className="swift-checklist-container">
            <div className="checklist-logo">
              <img src="/logo/zelim-logo.svg" alt="Zelim Logo" style={{ height: '40px' }} />
            </div>

            <div className="complete-card">
              <div className="complete-icon-circle">
                <i className="fa-solid fa-circle-check"></i>
              </div>
              
              <h1 className="complete-title">Unscheduled Maintenance Submitted</h1>
              
              <p className="complete-text">
                The unscheduled maintenance record has been successfully uploaded to Airtable. 
                Your local draft has been cleared and the unit record has been updated.
              </p>

              <Link href={`/swift/${id}`} className="back-to-unit-btn">
                <i className="fa-solid fa-arrow-left"></i>
                Back to Unit Dashboard
              </Link>
            </div>
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