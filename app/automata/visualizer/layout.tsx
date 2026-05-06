import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SITE_NAME, absoluteUrl, buildPageMetadata } from "../../seo";

const visualizerDescription =
  "Build and simulate DFA, NFA, epsilon-NFA, DPDA, NPDA, Turing machines, Mealy, Moore, Buchi, and timed automata with step-by-step timelines, import/export, and instantaneous descriptions.";

const featureList = [
  "Interactive graph editor for automata and transducers",
  "Step-by-step simulation timelines and playback controls",
  "Support for DFA, NFA, epsilon-NFA, PDA, Turing machines, Mealy, Moore, Buchi, and timed automata",
  "Import, export, and example-driven workflows",
  "Dedicated help guide and instantaneous description views",
];

export const metadata: Metadata = buildPageMetadata({
  title: "Automata Visualizer for DFA, NFA, PDA, and Turing Machines",
  description: visualizerDescription,
  path: "/automata/visualizer/",
  keywords: [
    "automata visualizer",
    "DFA visualizer",
    "NFA visualizer",
    "PDA visualizer",
    "Turing machine visualizer",
    "formal language simulator",
  ],
});

export default function AutomataVisualizerLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "Automata Visualizer",
        applicationCategory: "EducationalApplication",
        operatingSystem: "Any",
        browserRequirements: "Requires JavaScript",
        isAccessibleForFree: true,
        url: absoluteUrl("/automata/visualizer/"),
        description: visualizerDescription,
        featureList,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        publisher: {
          "@type": "Organization",
          name: SITE_NAME,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: absoluteUrl("/"),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Automata",
            item: absoluteUrl("/automata/"),
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Automata Visualizer",
            item: absoluteUrl("/automata/visualizer/"),
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="sr-only">
        <h1>Automata Visualizer</h1>
        <p>
          Build and simulate DFA, NFA, epsilon-NFA, pushdown automata,
          Turing machines, Mealy machines, Moore machines, Buchi automata,
          and timed automata in one interactive tool.
        </p>
        <p>
          Study step-by-step runs with timelines, instantaneous descriptions,
          machine setup controls, and import or export support for formal
          language workflows.
        </p>
      </div>
      {children}
    </>
  );
}