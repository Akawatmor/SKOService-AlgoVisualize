import type { Metadata } from "next";
import Link from "next/link";

import packageJson from "../../../../package.json";
import { buildPageMetadata } from "../../../seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Automata Visualizer Help and Syntax Guide",
  description:
    "Learn the Automata Visualizer syntax, machine modes, PDA and TM setup, timelines, import/export flow, and troubleshooting steps.",
  path: "/automata/visualizer/help/",
  keywords: [
    "automata visualizer help",
    "automata syntax guide",
    "PDA transition syntax",
    "Turing machine transition syntax",
  ],
});

const quickStartSteps = [
  {
    title: "Select a machine model",
    description:
      "Choose DFA, NFA, PDA, TM, Mealy, Moore, or another supported mode from the mode selector at the top of the visualizer.",
  },
  {
    title: "Build the graph",
    description:
      "Add states, mark the start or accept states, and connect states with labeled transitions that match the current machine type.",
  },
  {
    title: "Prepare the machine setup",
    description:
      "For PDA and TM, open the setup controls before typing transition labels so the parser knows how many stores, tapes, heads, or extensions are active.",
  },
  {
    title: "Enter the input",
    description:
      "Type the input word on the toolbar, then start the simulation with step-by-step controls or full auto-run.",
  },
  {
    title: "Inspect the run",
    description:
      "Use the timeline, sidebar summaries, and View ID page to inspect every reachable configuration in detail.",
  },
  {
    title: "Save or share",
    description:
      "Export the current board to JSON, import an example, or reopen the board later from the same browser session through automatic draft restore.",
  },
];

const detailedSections = [
  {
    id: "board-editing",
    title: "Board Editing",
    intro:
      "The canvas behaves like a live editor. Most core actions can be done without leaving the board.",
    bullets: [
      "Double-click empty space or use the add-node shortcut to create a new state.",
      "Double-click a state to toggle start and accept markers.",
      "Drag from one handle to another to create a transition edge.",
      "Double-click an edge to edit its transition label.",
      "Use Note and Frame tools to annotate a proof, a derivation, or a construction directly on the board.",
      "Layer controls let you move selected notes and frames behind or in front of other elements.",
    ],
  },
  {
    id: "simulation",
    title: "Simulation Flow",
    intro:
      "Every machine mode shares the same run workflow, but each mode calculates its own next configurations.",
    bullets: [
      "Start initializes the active state set or configuration set from the designated start state.",
      "Next Step executes exactly one symbol consumption step or one TM transition wave.",
      "Run uses the playback speed slider and keeps appending snapshots to the timeline.",
      "Pause stops auto-run without clearing the current frontier.",
      "Reset stops the simulation and clears run state while preserving the board.",
      "Timeline navigation is non-destructive, so you can jump backward to inspect earlier snapshots.",
    ],
  },
  {
    id: "id-view",
    title: "Instantaneous Description View",
    intro:
      "The View ID action serializes the current run and opens a dedicated inspection page.",
    bullets: [
      "Visual Tree mode keeps parent-child relationships between configurations so branching runs stay readable.",
      "Textbook ID mode renders configurations as plain text, one line per configuration, with horizontal scrolling for long content.",
      "PDA IDs show one store or several stores depending on the active PDA extension.",
      "TM IDs show the current state, tape content, and head positions, including multi-tape and multi-head layouts.",
      "Returning to the visualizer does not clear the board because the draft is persisted in browser storage.",
    ],
  },
  {
    id: "persistence",
    title: "Persistence, Import, and Export",
    intro:
      "The visualizer keeps both the diagram and the current simulation context in local storage.",
    bullets: [
      "Draft restore runs automatically when the visualizer opens in the same browser.",
      "Clear Board is the explicit action that removes the current board from your working state.",
      "Export writes a JSON document that preserves the graph and the active machine metadata.",
      "Import accepts local files, URLs, and bundled examples.",
      "PDA setup and TM setup are included in the machine metadata so imported or restored boards keep the same semantics.",
    ],
  },
];

const syntaxCards = [
  {
    title: "Finite Automata",
    description: "Comma-separated input symbols. Use e or epsilon where the target mode supports epsilon transitions.",
    example: "a,b,e",
  },
  {
    title: "Mealy / Moore",
    description: "Use input/output pairs separated by semicolons when needed.",
    example: "a/0; b/1",
  },
  {
    title: "PDA",
    description: "Use input,pop->push. Multi-store variants require tuple syntax in both the pop and push positions.",
    example: "a,Z->AZ  or  a,(Z,epsilon)->(AZ,epsilon)",
  },
  {
    title: "TM",
    description: "Use read->write,move or read/write,move. Multi-head and multi-track layouts expand the tuple arity.",
    example: "0->1,R  or  (0,1)->(1,0),(R,S)",
  },
];

const pdaModes = [
  {
    title: "Classic PDA",
    details: "Single stack with the familiar input,pop->push label format.",
    example: "a,Z->AZ",
  },
  {
    title: "Two-Stack PDA",
    details: "Two active stacks. Every rule must provide both pop operands and both push operands.",
    example: "a,(Z,epsilon)->(AZ,epsilon)",
  },
  {
    title: "k-Stack PDA",
    details: "General multi-stack mode with up to 20 stacks. The tuple length must match the configured stack count.",
    example: "a,(Z,epsilon,epsilon)->(AZ,epsilon,epsilon)",
  },
  {
    title: "Nested Stack Automata",
    details: "Supports bracketed frame tokens such as [AZ] so you can move grouped frames as a single unit.",
    example: "a,[AZ]->[BZ]Z",
  },
  {
    title: "Queue Automata",
    details: "The same label surface is reused, but pop removes from the front and push appends to the rear.",
    example: "a,Z->AZ",
  },
];

const tmModes = [
  {
    title: "Tapes and Heads",
    details:
      "Choose how many tapes and heads the machine has before editing transition labels. Rule tuple length follows the total active head-track lanes.",
  },
  {
    title: "Head to Track Mapping",
    details:
      "Each head can control one or more tracks. If one head spans multiple tracks, all of its tracks must move together.",
  },
  {
    title: "Input Seeding",
    details:
      "Machine mode seeds only Tape 1 with the input. Textbook mode copies the same input to every tape.",
  },
  {
    title: "2D Sheet",
    details:
      "Enables U and D moves by treating the tape as a flattened matrix with a configurable column count.",
  },
  {
    title: "RAM Access and State Storage",
    details:
      "RAM jump moves such as @12 are validated through TM Setup. State storage reads suffixes like qCarry{a} directly from the state label.",
  },
];

const shortcuts = [
  ["Ctrl+N or Insert", "Create a new node quickly"],
  ["Ctrl+B", "Jump to the previous simulation step"],
  ["Ctrl+Z / Ctrl+Y", "Undo or redo board edits"],
  ["Delete / Backspace", "Delete the current selection"],
  ["Ctrl+Shift+Backspace", "Clear the full board"],
  ["Ctrl+/ or F1", "Open this detailed help guide"],
];

const troubleshooting = [
  {
    title: "A transition label is rejected",
    details:
      "Check the active machine mode first. PDA and TM labels are validated against the current setup, so a multi-stack or multi-head rule will be rejected when the setup still expects the classic shape.",
  },
  {
    title: "The simulation stops immediately",
    details:
      "Verify that one state is marked as the start state, that the input matches the transition alphabet, and that the current frontier still has at least one valid outgoing transition.",
  },
  {
    title: "I need to inspect a branching run",
    details:
      "Open View ID and switch to Visual Tree. The dedicated page keeps each parent-child branch separate so nondeterministic runs stay readable.",
  },
  {
    title: "I left the visualizer and want the same board back",
    details:
      "Open the visualizer in the same browser session. The draft restore system reloads the board and the last simulation state unless the board was explicitly cleared.",
  },
];

export default function AutomataVisualizerHelpPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#1e293b_0%,_#0f172a_45%,_#020617_100%)] text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-10">
        <header className="mb-10 overflow-hidden rounded-[28px] border border-slate-700/70 bg-slate-950/60 shadow-[0_30px_80px_rgba(2,6,23,0.45)] backdrop-blur">
          <div className="grid gap-8 px-6 py-8 md:grid-cols-[1.6fr_0.8fr] md:px-8">
            <div>
              <div className="mb-4 inline-flex items-center gap-3 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1.5 text-sm font-semibold text-cyan-200">
                <span>Automata Visualizer Manual</span>
                <span className="rounded-full bg-slate-900/70 px-2 py-0.5 text-xs text-slate-300">
                  v{packageJson.version}
                </span>
              </div>
              <h1 className="max-w-3xl text-4xl font-black tracking-tight text-white sm:text-5xl">
                Detailed HTML guide for building, simulating, and inspecting automata.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
                This page is the long-form manual linked from the Help button in the visualizer. Use it as the reference for graph editing, label syntax, PDA and TM extensions, ID inspection, import and export, and common troubleshooting steps.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/automata/visualizer"
                  className="inline-flex items-center rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
                >
                  Back to Visualizer
                </Link>
                <a
                  href="#quick-start"
                  className="inline-flex items-center rounded-full border border-slate-600 bg-slate-900/70 px-5 py-2.5 text-sm font-bold text-slate-200 transition hover:border-slate-400 hover:text-white"
                >
                  Start Reading
                </a>
              </div>
            </div>

            <aside className="rounded-[24px] border border-slate-800 bg-slate-950/70 p-5">
              <div className="mb-4 text-sm font-bold uppercase tracking-[0.22em] text-slate-400">
                On This Page
              </div>
              <nav className="grid gap-2 text-sm">
                {[
                  ["quick-start", "Quick Start"],
                  ["editing", "Board Editing"],
                  ["syntax", "Transition Syntax"],
                  ["pda", "PDA Extensions"],
                  ["tm", "TM Setup"],
                  ["shortcuts", "Shortcuts"],
                  ["troubleshooting", "Troubleshooting"],
                ].map(([id, label]) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    className="rounded-xl border border-transparent px-3 py-2 text-slate-300 transition hover:border-slate-700 hover:bg-slate-900 hover:text-white"
                  >
                    {label}
                  </a>
                ))}
              </nav>
            </aside>
          </div>
        </header>

        <section id="quick-start" className="mb-10 scroll-mt-8">
          <div className="mb-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-800" />
            <span className="text-sm font-bold uppercase tracking-[0.28em] text-slate-400">
              Quick Start
            </span>
            <div className="h-px flex-1 bg-slate-800" />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {quickStartSteps.map((step, index) => (
              <article
                key={step.title}
                className="rounded-[24px] border border-slate-800 bg-slate-950/60 p-5 shadow-[0_20px_60px_rgba(2,6,23,0.2)]"
              >
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-400/15 text-sm font-black text-amber-200">
                  {index + 1}
                </div>
                <h2 className="text-lg font-bold text-white">{step.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="editing" className="mb-10 scroll-mt-8">
          <div className="grid gap-4 lg:grid-cols-2">
            {detailedSections.map((section) => (
              <article
                key={section.id}
                id={section.id}
                className="rounded-[24px] border border-slate-800 bg-slate-950/60 p-6"
              >
                <h2 className="text-2xl font-black text-white">{section.title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">{section.intro}</p>
                <ul className="mt-4 grid gap-3 text-sm leading-6 text-slate-200">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3">
                      {bullet}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section id="syntax" className="mb-10 scroll-mt-8 rounded-[28px] border border-slate-800 bg-slate-950/60 p-6 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm font-bold uppercase tracking-[0.22em] text-slate-400">
                Transition Syntax
              </div>
              <h2 className="mt-2 text-3xl font-black text-white">
                Match every edge label to the active machine semantics.
              </h2>
            </div>
            <div className="max-w-md text-sm leading-6 text-slate-300">
              The label parser is mode-aware. If a label is rejected, the first thing to verify is whether the current mode and setup match the label shape you typed.
            </div>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            {syntaxCards.map((card) => (
              <article
                key={card.title}
                className="rounded-[22px] border border-slate-800 bg-slate-900/70 p-5"
              >
                <h3 className="text-lg font-bold text-white">{card.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{card.description}</p>
                <div className="mt-4 rounded-2xl bg-slate-950 px-4 py-3 font-mono text-sm text-cyan-200">
                  {card.example}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="pda" className="mb-10 scroll-mt-8 rounded-[28px] border border-slate-800 bg-slate-950/60 p-6 sm:p-8">
          <div className="mb-6 max-w-3xl">
            <div className="text-sm font-bold uppercase tracking-[0.22em] text-slate-400">
              PDA Extensions
            </div>
            <h2 className="mt-2 text-3xl font-black text-white">
              Configure the storage model before you write PDA transitions.
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              The PDA Setup modal changes both parsing and runtime behavior. Sidebar summaries and the ID page will follow the active storage model automatically.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {pdaModes.map((mode) => (
              <article
                key={mode.title}
                className="rounded-[22px] border border-slate-800 bg-slate-900/70 p-5"
              >
                <h3 className="text-lg font-bold text-white">{mode.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{mode.details}</p>
                <div className="mt-4 rounded-2xl bg-slate-950 px-4 py-3 font-mono text-sm text-emerald-200">
                  {mode.example}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="tm" className="mb-10 scroll-mt-8 rounded-[28px] border border-slate-800 bg-slate-950/60 p-6 sm:p-8">
          <div className="mb-6 max-w-3xl">
            <div className="text-sm font-bold uppercase tracking-[0.22em] text-slate-400">
              TM Setup
            </div>
            <h2 className="mt-2 text-3xl font-black text-white">
              Tapes, heads, and extensions all affect label validation.
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              TM Setup is the control surface for arity, movement rules, input seeding, multi-track heads, 2D sheet movement, RAM jump support, and state storage.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {tmModes.map((mode) => (
              <article
                key={mode.title}
                className="rounded-[22px] border border-slate-800 bg-slate-900/70 p-5"
              >
                <h3 className="text-lg font-bold text-white">{mode.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{mode.details}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="shortcuts" className="mb-10 scroll-mt-8 rounded-[28px] border border-slate-800 bg-slate-950/60 p-6 sm:p-8">
          <div className="mb-5">
            <div className="text-sm font-bold uppercase tracking-[0.22em] text-slate-400">
              Shortcuts
            </div>
            <h2 className="mt-2 text-3xl font-black text-white">Keyboard shortcuts for the most common actions.</h2>
          </div>
          <div className="overflow-hidden rounded-[22px] border border-slate-800 bg-slate-900/70">
            <table className="min-w-full border-collapse text-left text-sm text-slate-200">
              <thead className="bg-slate-950/80 text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-bold">Shortcut</th>
                  <th className="px-4 py-3 font-bold">Action</th>
                </tr>
              </thead>
              <tbody>
                {shortcuts.map(([shortcut, action]) => (
                  <tr key={shortcut} className="border-t border-slate-800 align-top">
                    <td className="px-4 py-3 font-mono text-cyan-200">{shortcut}</td>
                    <td className="px-4 py-3 text-slate-300">{action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="troubleshooting" className="scroll-mt-8 rounded-[28px] border border-slate-800 bg-slate-950/60 p-6 sm:p-8">
          <div className="mb-6 max-w-3xl">
            <div className="text-sm font-bold uppercase tracking-[0.22em] text-slate-400">
              Troubleshooting
            </div>
            <h2 className="mt-2 text-3xl font-black text-white">
              Common issues and the quickest way to verify them.
            </h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {troubleshooting.map((item) => (
              <article
                key={item.title}
                className="rounded-[22px] border border-slate-800 bg-slate-900/70 p-5"
              >
                <h3 className="text-lg font-bold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{item.details}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}