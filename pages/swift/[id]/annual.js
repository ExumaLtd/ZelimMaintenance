export default function AnnualMaintenancePage({ query }) {
  const { id } = query;

  return (
    <div style={{ padding: "40px", fontFamily: "sans-serif" }}>
      <h1>SWIFT Unit: {id.toUpperCase()}</h1>
      <h2>Annual Maintenance Checklist</h2>

      <p>This is the placeholder for Annual Maintenance.</p>

      <a href={`/swift/${id}`}>← Back to unit</a>
    </div>
  );
}

AnnualMaintenancePage.getInitialProps = ({ query }) => {
  return { query };
};
