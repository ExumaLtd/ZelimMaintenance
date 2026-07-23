import Head from "next/head";
import PortalShell from "@/components/ui/portal-shell";
import MessageCard from "@/components/ui/message-card";
import ArrowButton from "@/components/ui/arrow-button";

export default function NotFound() {
  return (
    <PortalShell>
      <Head>
        <title>Page Not Found | Zelim Maintenance Portal</title>
      </Head>

      <MessageCard
        title="404 – Page not found"
        text="The page you're looking for doesn't exist."
        action={<ArrowButton href="/">Return to the homepage</ArrowButton>}
      />
    </PortalShell>
  );
}
