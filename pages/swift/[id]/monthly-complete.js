import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { ThumbsUp } from "lucide-react";

export default function MonthlyComplete() {
  const router = useRouter();
  const { id } = router.query;
  const [unitSN, setUnitSN] = useState("");

  useEffect(() => {
    const savedSN = localStorage.getItem("last_submitted_sn");
    if (savedSN) {
      setUnitSN(savedSN);
      localStorage.removeItem("last_submitted_sn");
    }
  }, []);

  return (
    <div className="form-scope">
      <Head>
        <title>Monthly maintenance submitted | Zelim</title>
      </Head>

      <div className="swift-main-layout-wrapper">
        <div className="complete-page-wrapper">
          <div className="complete-card">
            <div className="complete-icon-circle">
              <ThumbsUp size={32} strokeWidth={1.5} />
            </div>

            <h1 className="complete-title">
              Monthly maintenance submitted <span>for {unitSN || "unit"}</span>
            </h1>

            <p className="complete-text">
              Your monthly maintenance has successfully been recorded. You will receive email confirmation shortly.
            </p>

            <Link href={`/swift/${id}`} className="return-dashboard-btn">
              Return to dashboard
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