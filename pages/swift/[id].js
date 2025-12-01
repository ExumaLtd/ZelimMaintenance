import { useRouter } from "next/router";

export default function SwiftUnitPage() {
  const router = useRouter();
  const { id } = router.query;

  const displayId = id ? id.toUpperCase() : "…";

  return (
    <div style={{ padding: "40px", fontFamily: "sans-serif" }}>
      <h1>SWIFT Unit: {displayId}</h1>

      <p>Select maintenance type:</p>

      <ul>
        <li>
          <a href={`/swift/${id}/annual`}>Annual Maintenance</a>
        </li>
        <li>
          <a href={`/swift/${id}/depth`}>Depth Maintenance</a>
        </li>
      </ul>
    </div>
  );
}
