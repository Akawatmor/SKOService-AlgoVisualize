"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { useEffect } from "react";

import {
  AUTOMATA_SHARE_QUERY_KEY,
  VISUALIZER_SHARED_IMPORT_KEY,
  decodeAutomataSharePayload,
} from "../automata/visualizer/shareUrl";

const VISUALIZER_PATH = "/automata/visualizer";

const getShareState = (encodedPayload: string | null) => {
  if (!encodedPayload) {
    return {
      status: "error" as const,
      errorMessage: "Missing automatavis share payload in the URL.",
    };
  }

  try {
    const decodedJson = decodeAutomataSharePayload(encodedPayload);
    JSON.parse(decodedJson);
    return {
      status: "ready" as const,
      decodedJson,
    };
  } catch (error) {
    console.error("Failed to parse shared automata link", error);
    return {
      status: "error" as const,
      errorMessage:
        "This share URL is invalid, corrupted, or too large for the current browser.",
    };
  }
};

export default function ImportPageClient() {
  const searchParams = useSearchParams();
  const encodedPayload = searchParams.get(AUTOMATA_SHARE_QUERY_KEY);
  const shareState = getShareState(encodedPayload);

  useEffect(() => {
    if (shareState.status !== "ready") return;

    try {
      localStorage.setItem(VISUALIZER_SHARED_IMPORT_KEY, shareState.decodedJson);
      window.location.replace(VISUALIZER_PATH);
    } catch (error) {
      console.error("Failed to load shared automata link", error);
    }
  }, [shareState]);

  return (
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
          fontFamily: "var(--font-anuphan), var(--font-geist-sans), sans-serif",
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
          Shared Automata Import
        </p>
        <h1 style={{ margin: "10px 0 12px", fontSize: 30, lineHeight: 1.15 }}>
          {shareState.status === "error"
            ? "Unable to open this link"
            : "Loading shared automaton..."}
        </h1>
        <p style={{ margin: 0, color: "#94a3b8", fontSize: 15, lineHeight: 1.7 }}>
          {shareState.status === "error"
            ? shareState.errorMessage
            : "The shared payload is being decoded and forwarded to the visualizer."}
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
          <Link
            href={VISUALIZER_PATH}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 160,
              padding: "11px 16px",
              borderRadius: 999,
              background: "#0ea5e9",
              color: "#f8fafc",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Open Visualizer
          </Link>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 160,
              padding: "11px 16px",
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.28)",
              color: "#cbd5e1",
              textDecoration: "none",
            }}
          >
            Back To Home
          </Link>
        </div>
      </section>
    </main>
  );
}