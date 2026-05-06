import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SITE_NAME } from "../../seo";

export const metadata: Metadata = {
  title: {
    absolute: "Automata Simulation Trace | SKOVisual",
  },
  description:
    "Session-specific automata simulation traces generated from the visualizer.",
  alternates: {
    canonical: "/automata/visualizer/",
  },
  openGraph: {
    title: "Automata Simulation Trace | SKOVisual",
    description:
      "Session-specific automata simulation traces generated from the visualizer.",
    url: "/automata/visualizer/",
    siteName: SITE_NAME,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Automata Simulation Trace | SKOVisual",
    description:
      "Session-specific automata simulation traces generated from the visualizer.",
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function InstantaneousDescriptionLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return children;
}