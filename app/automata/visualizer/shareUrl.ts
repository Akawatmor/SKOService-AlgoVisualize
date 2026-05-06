import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";

export const AUTOMATA_SHARE_ROUTE = "/import";
export const AUTOMATA_SHARE_QUERY_KEY = "automatavis";
export const VISUALIZER_SHARED_IMPORT_KEY = "automata-visualizer-shared-import-v1";

export const resolveAutomataImportUrl = (
  value: string | null,
  pageProtocol: string
) => {
  if (!value) {
    return {
      status: "error" as const,
      errorMessage: "The automatavis value must be a valid http(s) URL.",
    };
  }

  try {
    const parsedUrl = new URL(value.trim());
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new Error("Unsupported protocol");
    }

    const originalUrl = parsedUrl.toString();
    const shouldUpgradeToHttps =
      pageProtocol === "https:" && parsedUrl.protocol === "http:";

    if (shouldUpgradeToHttps) {
      parsedUrl.protocol = "https:";
    }

    return {
      status: "ready" as const,
      importUrl: parsedUrl.toString(),
      originalUrl,
      wasUpgradedToHttps: shouldUpgradeToHttps,
    };
  } catch (error) {
    console.error("Failed to parse import URL", error);
    return {
      status: "error" as const,
      errorMessage: "The automatavis value must be a valid http(s) URL.",
    };
  }
};

export const encodeAutomataSharePayload = (payload: unknown) => {
  const encoded = compressToEncodedURIComponent(JSON.stringify(payload));
  if (!encoded) {
    throw new Error("Failed to encode share payload.");
  }
  return encoded;
};

export const decodeAutomataSharePayload = (encoded: string) => {
  const decompressed = decompressFromEncodedURIComponent(encoded);
  if (!decompressed) {
    throw new Error("Invalid or corrupted share payload.");
  }
  return decompressed;
};

export const buildAutomataShareUrl = (payload: unknown, origin: string) => {
  const url = new URL(AUTOMATA_SHARE_ROUTE, origin);
  url.searchParams.set(
    AUTOMATA_SHARE_QUERY_KEY,
    encodeAutomataSharePayload(payload)
  );
  return url.toString();
};