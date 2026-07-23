import Head from 'next/head';
import Image from 'next/image';
import { getClientLogo } from '@/utils/get-company-logo';
import type { ReactNode } from 'react';
import type { Unit } from './types';

/**
 * Page frame shared by every maintenance form: client logo, hero title with
 * the unit serial number, and the Zelim footer. Still styled by the legacy
 * form.css (form-scope) until the forms migrate to Tailwind.
 */
export default function FormShell({ unit, headTitle, heroLabel, children }: { unit: Unit; headTitle: string; heroLabel: string; children: ReactNode }) {
  const logo = getClientLogo(unit?.company, unit?.serial_number);

  return (
    <div className="form-scope">
      <Head>
        <title>{`${unit?.serial_number} | ${headTitle}`}</title>
      </Head>

      <div className="swift-main-layout-wrapper">
        <div className="page-wrapper">
          <div className="swift-checklist-container">
            {logo && (
              <div className="checklist-logo">
                <Image src={logo.src} alt={logo.alt} fill priority sizes="250px" />
              </div>
            )}

            <h1 className="checklist-hero-title">
              {unit?.serial_number}
              <span className="break-point">{heroLabel}</span>
            </h1>

            {children}
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
