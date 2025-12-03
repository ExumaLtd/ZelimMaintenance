import { useState } from "react";
import { useRouter } from "next/router";

export default function SwiftPinEntryPage() {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!pin.trim()) {
      setError("Please enter your SWIFT access code.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/swift-resolve-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Code not recognised. Please check and try again.");
        return;
      }

      // Success – go to that unit’s landing page
      router.push(`/swift/${data.publicToken}`);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        background: "#f3f4f6",
        padding: "24px",
      }}
    >
      <div
        style={{
          maxWidth: "420px",
          width: "100%",
          background: "white",
          padding: "24px 28px",
          borderRadius: "12px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ fontSize: "20px", marginBottom: "8px" }}>
          SWIFT Maintenance Portal
        </h1>
        <p style={{ fontSize: "14px", color: "#4b5563", marginBottom: "20px" }}>
          Enter the access code printed on your SWIFT unit to view or start
          maintenance.
        </p>

        <form onSubmit={handleSubmit}>
          <label
            htmlFor="pin"
            style={{ display: "block", fontSize: "13px", marginBottom: "6px" }}
          >
            Access code
          </label>
          <input
            id="pin"
            type="text"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="e.g. SWI001"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              fontSize: "14px",
              marginBottom: "12px",
            }}
          />

          {error && (
            <p
              style={{
                color: "#b91c1c",
                fontSize: "13px",
                marginBottom: "10px",
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "none",
              background: loading ? "#9ca3af" : "#111827",
              color: "white",
              fontSize: "14px",
              cursor: loading ? "default" : "pointer",
            }}
          >
            {loading ? "Checking..." : "Continue"}
          </button>
        </form>
      </div>
    </main>
  );
}
