import type { MetadataRoute } from "next";

import { absoluteUrl } from "./seo";

export const dynamic = "force-static";

const routes: Array<{
  path: string;
  priority: number;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
}> = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/automata/", priority: 0.95, changeFrequency: "weekly" },
  { path: "/automata/visualizer/", priority: 0.95, changeFrequency: "weekly" },
  { path: "/automata/visualizer/help/", priority: 0.8, changeFrequency: "monthly" },
  { path: "/automata/converter/nfa-to-dfa/", priority: 0.8, changeFrequency: "monthly" },
  { path: "/automata/converter/enfa-to-dfa/", priority: 0.8, changeFrequency: "monthly" },
  { path: "/automata/converter/re-to-enfa/", priority: 0.8, changeFrequency: "monthly" },
  { path: "/automata/language-checker/", priority: 0.75, changeFrequency: "monthly" },
  { path: "/sorting/", priority: 0.7, changeFrequency: "monthly" },
  { path: "/sorting/visualizer/", priority: 0.7, changeFrequency: "monthly" },
  { path: "/search/", priority: 0.65, changeFrequency: "monthly" },
  { path: "/tree/", priority: 0.65, changeFrequency: "monthly" },
  { path: "/cipher/", priority: 0.6, changeFrequency: "monthly" },
  { path: "/ml/", priority: 0.6, changeFrequency: "monthly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routes.map(({ path, priority, changeFrequency }) => ({
    url: absoluteUrl(path),
    lastModified,
    changeFrequency,
    priority,
  }));
}