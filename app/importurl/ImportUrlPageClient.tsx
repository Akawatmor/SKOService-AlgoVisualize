"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";

import {
  AUTOMATA_SHARE_QUERY_KEY,
  VISUALIZER_SHARED_IMPORT_KEY,
} from "../automata/visualizer/shareUrl";

const VISUALIZER_PATH = "/automata/visualizer";

const validateImportUrl = (value: string | null) => {
  if (!value) {
    return {
      status: "error" as const,
      errorMessage: "Missing automatavis import URL in the query string.",
    };
  }

  try {
    const parsedUrl = new URL(value);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new Error("Unsupported protocol");
    }
    return {
      status: "ready" as const,
      importUrl: parsedUrl.toString(),
    };
  } catch (error) {
    console.error("Failed to parse import URL", error);
    return {
      status: "error" as const,
      errorMessage: "The automatavis value must be a valid http(s) URL.",
    };
  }
};

export default function ImportUrlPageClient() {
  const searchParams = useSearchParams();
  const rawImportUrl = searchParams.get(AUTOMATA_SHARE_QUERY_KEY);
  const urlState = validateImportUrl(rawImportUrl);
  const [loadState, setLoadState] = useState<
    | { status: "loading" }
    | { status: "error"; errorMessage: string }
  >({ status: "loading" });

  useEffect(() => {
    if (urlState.status !== "ready") {
      setLoadState({
        status: "error",
        errorMessage: urlState.errorMessage,
      });
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        const response = await fetch(urlState.importUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const text = await response.text();
        JSON.parse(text);

        if (cancelled) return;

        localStorage.setItem(VISUALIZER_SHARED_IMPORT_KEY, text);
        window.location.replace(VISUALIZER_PATH);
      } catch (error) {
        console.error("Failed to import automata from URL", error);
        if (cancelled) return;
        setLoadState({
          status: "error",
          errorMessage:
            "Unable to fetch or parse JSON from the provided import URL. Check the URL, CORS policy, and JSON payload.",
        });
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [urlState]);

  const errorMessage =
    urlState.status === "error"
      ? urlState.errorMessage
      : loadState.status === "error"
        ? loadState.errorMessage
        : null;

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
          Import From URL
        </p>
        <h1 style={{ margin: "10px 0 12px", fontSize: 30, lineHeight: 1.15 }}>
          {errorMessage ? "Unable to open this import URL" : "Loading automaton from URL..."}
        </h1>
        <p style={{ margin: 0, color: "#94a3b8", fontSize: 15, lineHeight: 1.7 }}>
          {errorMessage
            ? errorMessage
            : "The JSON file is being fetched and forwarded to the visualizer."}
        </p>

        {urlState.status === "ready" ? (
          <p
            style={{
              margin: "14px 0 0",
              color: "#67e8f9",
              fontSize: 12,
              lineHeight: 1.6,
              wordBreak: "break-all",
            }}
          >
            Source URL: {urlState.importUrl}
          </p>
        ) : null}

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