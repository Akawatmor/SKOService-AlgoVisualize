import type { MetadataRoute } from "next";

import {
  DEFAULT_SITE_DESCRIPTION,
  SITE_NAME,
} from "./seo";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: DEFAULT_SITE_DESCRIPTION,
    start_url: "/automata/visualizer/",
    scope: "/",
    display: "standalone",
    orientation: "landscape",
    background_color: "#020617",
    theme_color: "#020617",
    lang: "en",
    categories: ["education", "developer tools", "productivity"],
    icons: [
      {
        src: "/pwa/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Automata Visualizer",
        short_name: "Visualizer",
        description: "Open the automata visualizer workspace.",
        url: "/automata/visualizer/",
      },
      {
        name: "Automata Help",
        short_name: "Help",
        description: "Open the visualizer help guide and syntax reference.",
        url: "/automata/visualizer/help/",
      },
    ],
    related_applications: [],
    prefer_related_applications: false,
    launch_handler: {
      client_mode: ["navigate-existing", "auto"],
    },
  };
}