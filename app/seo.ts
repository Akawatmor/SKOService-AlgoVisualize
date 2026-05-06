import type { Metadata } from "next";

export const SITE_NAME = "SKOVisual";
export const SITE_CREATOR = "Akawatmor";
export const SITE_URL = "https://skovisual.akawatmor.com";
export const DEFAULT_SITE_TITLE =
  "SKOVisual | Interactive Computer Science Visualizer";
export const DEFAULT_SITE_DESCRIPTION =
  "Interactive computer science visualization tools for automata, formal languages, algorithms, trees, ciphers, and machine learning.";
export const DEFAULT_SITE_KEYWORDS = [
  "computer science visualizer",
  "automata visualizer",
  "formal languages",
  "DFA simulator",
  "NFA simulator",
  "PDA simulator",
  "Turing machine simulator",
  "algorithm visualization",
  "interactive learning tools",
  "SKOVisual",
];

type OpenGraphType = "website" | "article";

type BuildPageMetadataInput = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  type?: OpenGraphType;
};

const normalizeSiteUrl = (value?: string | null) => {
  const trimmed = value?.trim();
  if (!trimmed) return SITE_URL;

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  return withProtocol.replace(/\/+$/, "");
};

export const getSiteUrl = () =>
  normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL ??
      process.env.SITE_URL ??
      process.env.CF_PAGES_BRANCH_URL ??
      process.env.CF_PAGES_URL ??
      process.env.VERCEL_URL
  );

export const absoluteUrl = (path = "/") => new URL(path, `${getSiteUrl()}/`).toString();

const mergeKeywords = (keywords?: string[]) =>
  Array.from(new Set([...DEFAULT_SITE_KEYWORDS, ...(keywords ?? [])]));

export const buildPageMetadata = ({
  title,
  description,
  path,
  keywords,
  type = "website",
}: BuildPageMetadataInput): Metadata => {
  const socialTitle = `${title} | ${SITE_NAME}`;

  return {
    title: {
      absolute: socialTitle,
    },
    description,
    keywords: mergeKeywords(keywords),
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: socialTitle,
      description,
      url: path,
      siteName: SITE_NAME,
      locale: "en_US",
      type,
    },
    twitter: {
      card: "summary",
      title: socialTitle,
      description,
    },
  };
};