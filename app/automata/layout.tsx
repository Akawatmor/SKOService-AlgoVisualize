import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildPageMetadata } from "../seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Automata Tools and Visualizers",
  description:
    "Explore interactive automata tools for DFA, NFA, epsilon-NFA, PDA, Turing machines, regular expressions, and formal language workflows.",
  path: "/automata/",
  keywords: [
    "automata tools",
    "formal language tools",
    "automata converter",
    "regular expression to epsilon NFA",
  ],
});

export default function AutomataLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return children;
}