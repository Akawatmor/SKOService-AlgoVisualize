import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.18),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(232,121,249,0.18),_transparent_30%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] px-6 py-10 text-slate-100">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <section className="grid w-full gap-8 overflow-hidden rounded-[36px] border border-slate-800 bg-slate-950/70 p-8 shadow-[0_40px_130px_rgba(2,6,23,0.82)] backdrop-blur md:grid-cols-[0.9fr_1.1fr] md:p-12">
          <div className="relative flex items-center justify-center rounded-[28px] border border-slate-800 bg-slate-950/70 p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.16),_transparent_55%)]" />
            <div className="relative text-center">
              <div className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-200">
                Error 404
              </div>
              <div className="mt-4 bg-gradient-to-r from-cyan-300 via-blue-400 to-fuchsia-400 bg-clip-text text-7xl font-black tracking-tight text-transparent sm:text-8xl">
                Lost Route
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <div className="inline-flex w-fit rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
              Page Not Found
            </div>
            <h1 className="mt-5 max-w-2xl text-4xl font-black tracking-tight text-white sm:text-5xl">
              This page does not exist in the current SKOVisual build.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              The address may be incorrect, the page may have moved, or the route may not be included in this static deployment.
              If you followed an older link, return to the homepage and reopen the tool from the current navigation.
            </p>

            <div className="mt-8 grid gap-4 rounded-[28px] border border-slate-800 bg-slate-950/60 p-5 text-sm leading-6 text-slate-300 sm:grid-cols-2">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Common causes
                </div>
                <p className="mt-2">
                  An outdated bookmark, a mistyped URL, or a route that is unavailable in the current Cloudflare Pages build.
                </p>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Best next step
                </div>
                <p className="mt-2">
                  Start from the homepage or jump directly to Automata Visualizer and continue from the active desktop workflow.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Back to Home
              </Link>
              <Link
                href="/automata/visualizer/"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-700 bg-slate-900/70 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800"
              >
                Open Automata Visualizer
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}