import { Suspense } from "react";
import ImportUrlPageClient from "./ImportUrlPageClient";

const loadingShell = (
  <main
    style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      padding: "24px",
      background:
        "radial-gradient(circle at top, rgba(14,165,233,0.18), transparent 45%), #020617",
      color: "#e2e8f0",
    }}
  >
    <section
      style={{
        width: "min(560px, 100%)",
        borderRadius: 20,
        border: "1px solid rgba(148,163,184,0.22)",
        background: "rgba(15,23,42,0.92)",
        padding: "28px 24px",
        boxShadow: "0 25px 60px rgba(2,6,23,0.45)",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#22d3ee",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Import From URL
      </p>
      <h1 style={{ margin: "10px 0 12px", fontSize: 30, lineHeight: 1.15 }}>
        Loading automaton from URL...
      </h1>
      <p style={{ margin: 0, color: "#94a3b8", fontSize: 15, lineHeight: 1.7 }}>
        The JSON file is being fetched and forwarded to the visualizer.
      </p>
    </section>
  </main>
);

export default function ImportUrlPage() {
  return (
    <Suspense fallback={loadingShell}>
      <ImportUrlPageClient />
    </Suspense>
  );
}