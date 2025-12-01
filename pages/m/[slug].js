export default function MaintenancePage() {
  const slug =
    typeof window !== "undefined"
      ? window.location.pathname.split("/").pop()
      : "loading";

  return (
    <main style={{ padding: "40px", fontFamily: "system-ui, sans-serif" }}>
      <h1>SWIFT Maintenance Portal</h1>
      <p>You scanned unit: <strong>{slug}</strong></p>
      <p>This is the placeholder for the maintenance form.</p>
    </main>
  );
}
