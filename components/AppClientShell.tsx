"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { SITE_NAME, SITE_URL } from "../app/seo";

const MIN_DESKTOP_WIDTH = 1180;
const MOBILE_UA_PATTERN =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Silk/i;
const BOT_UA_PATTERN =
  /bot|crawler|spider|crawling|google|bingpreview|duckduckbot|slurp|baiduspider|yandex|lighthouse|pagespeed|facebookexternalhit|twitterbot|slackbot|discordbot/i;

const isBotTraffic = (userAgent: string) => BOT_UA_PATTERN.test(userAgent);

const getShouldBlockExperience = () => {
  const userAgent = navigator.userAgent;
  if (isBotTraffic(userAgent)) return false;

  const narrowViewport = window.innerWidth < MIN_DESKTOP_WIDTH;
  const coarsePointer = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  const portraitViewport = window.matchMedia("(orientation: portrait)").matches;
  const mobileUserAgent = MOBILE_UA_PATTERN.test(userAgent);

  return narrowViewport || mobileUserAgent || (coarsePointer && portraitViewport);
};

type AppClientShellProps = {
  children: ReactNode;
};

export default function AppClientShell({ children }: AppClientShellProps) {
  const [isBlocked, setIsBlocked] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const syncBlockedState = () => {
      setIsBlocked(getShouldBlockExperience());
      setIsReady(true);
    };

    syncBlockedState();

    const coarsePointerQuery = window.matchMedia("(hover: none) and (pointer: coarse)");
    const orientationQuery = window.matchMedia("(orientation: portrait)");

    window.addEventListener("resize", syncBlockedState);

    const registerMediaListener = (
      mediaQuery: MediaQueryList,
      listener: () => void
    ) => {
      if (typeof mediaQuery.addEventListener === "function") {
        mediaQuery.addEventListener("change", listener);
        return () => mediaQuery.removeEventListener("change", listener);
      }

      mediaQuery.addListener(listener);
      return () => mediaQuery.removeListener(listener);
    };

    const cleanupCoarsePointer = registerMediaListener(
      coarsePointerQuery,
      syncBlockedState
    );
    const cleanupOrientation = registerMediaListener(
      orientationQuery,
      syncBlockedState
    );

    if ("serviceWorker" in navigator && window.isSecureContext && !isBotTraffic(navigator.userAgent)) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
        console.warn("Failed to register service worker", error);
      });
    }

    return () => {
      window.removeEventListener("resize", syncBlockedState);
      cleanupCoarsePointer();
      cleanupOrientation();
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const overflowValue = isBlocked ? "hidden" : "";
    document.documentElement.style.overflow = overflowValue;
    document.body.style.overflow = overflowValue;

    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [isBlocked, isReady]);

  return (
    <>
      <div aria-hidden={isReady && isBlocked ? true : undefined}>{children}</div>

      {isReady && isBlocked ? (
        <div className="fixed inset-0 z-[999] flex min-h-screen items-center justify-center overflow-y-auto bg-slate-950/96 px-6 py-10 text-slate-100 backdrop-blur-xl">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-[32px] border border-slate-800 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_42%),linear-gradient(160deg,_rgba(15,23,42,0.98),_rgba(2,6,23,1))] p-8 shadow-[0_30px_100px_rgba(2,6,23,0.85)] sm:p-10">
            <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
            <div className="mb-6 inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
              Desktop Only Experience
            </div>
            <h1 className="max-w-2xl text-3xl font-black tracking-tight text-white sm:text-5xl">
              {SITE_NAME} is optimized for desktop-sized visual workspaces.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              The automata visualizer and related tools need a wide canvas, dense controls,
              and multi-panel layouts that are not reliable on phones or narrow screens.
              Open this site on a desktop browser, or resize your window to at least {MIN_DESKTOP_WIDTH}px wide.
            </p>
            <div className="mt-8 grid gap-4 rounded-3xl border border-slate-800/80 bg-slate-950/60 p-5 text-sm text-slate-300 sm:grid-cols-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Minimum width
                </div>
                <div className="mt-2 text-lg font-semibold text-white">{MIN_DESKTOP_WIDTH}px</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Recommended device
                </div>
                <div className="mt-2 text-lg font-semibold text-white">Desktop or laptop</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Production URL
                </div>
                <div className="mt-2 break-all text-lg font-semibold text-cyan-200">{SITE_URL}</div>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Reload After Resizing
              </button>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-700 bg-slate-900/70 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800"
              >
                Return to Home
              </Link>
            </div>
            <p className="mt-6 text-sm leading-6 text-slate-400">
              Installation is supported as a desktop PWA through Chrome or Edge after the site loads on a supported screen.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}