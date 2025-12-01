export default function DepthMaintenancePage({ query }) {
  const { id } = query;

  return (
    <div style={{ padding: "40px", fontFamily: "sans-serif" }}>
      <h1>SWIFT Unit: {id.toUpperCase()}</h1>
      <h2>Depth Maintenance Checklist</h2>

      <p>This is the placeholder for Depth Maintenance.</p>

      <a href={`/swift/${id}`}>← Back to unit</a>
    </div>
  );
}

DepthMaintenancePage.getInitialProps = ({ query }) => {
  return { query };
};
