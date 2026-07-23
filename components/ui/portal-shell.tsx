import Image from "next/image";
import type { ReactNode } from "react";

/**
 * Full-height page frame used by portal pages: content pushed apart from the
 * Zelim footer logo, matching the legacy swift-main-layout-wrapper markup.
 */
export default function PortalShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full">
      <div className="flex min-h-screen flex-col justify-between px-10 max-[900px]:px-0">
        {children}

        <footer className="flex w-full shrink-0 justify-center pt-5 pb-10">
          <a href="https://www.zelim.com" target="_blank" rel="noopener noreferrer" className="block no-underline">
            <Image src="/logo/zelim-logo.svg" width={120} height={40} alt="Zelim logo" />
          </a>
        </footer>
      </div>
    </div>
  );
}
