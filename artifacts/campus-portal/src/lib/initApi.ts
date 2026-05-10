import { setBaseUrl } from "@workspace/api-client-react";

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? "").trim();

if (API_BASE_URL) {
  setBaseUrl(API_BASE_URL);
}

export const apiBase = API_BASE_URL;
