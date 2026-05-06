import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: {
    absolute: "Offline | SKOVisual",
  },
  description: "Offline fallback page for the SKOVisual desktop PWA.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.16),_transparent_38%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] px-6 py-10 text-slate-100">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-4xl items-center">
        <section className="w-full overflow-hidden rounded-[32px] border border-slate-800 bg-slate-950/70 p-8 shadow-[0_35px_120px_rgba(2,6,23,0.8)] backdrop-blur sm:p-10">
          <div className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-amber-200">
            Offline Mode
          </div>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-5xl">
            You are offline.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            SKOVisual can reopen cached pages as a desktop PWA, but the full visualizer workspace still needs a network connection for the latest static assets and updates.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/automata/visualizer/"
              className="inline-flex items-center justify-center rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Try the Visualizer Again
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-700 bg-slate-900/70 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800"
            >
              Return Home
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}