// src/utils/api-helpers.ts
import { fetchWithRetry } from "./api-retry";
import { KITSU_API_HEADERS } from "../config/api.config"; // Usar config local

/**
 * Builds a URL with parameters
 */
export const buildUrl = (baseUrl: string, params: Record<string, any> = {}): string => {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value.toString());
    }
  });
  return url.toString();
};

/**
 * Fetch with timeout and Kitsu-specific headers
 */
export const fetchKitsuWithTimeout = async (url: string, options?: RequestInit, timeoutMs: number = 10000): Promise<any> => {
  // console.log(`🌐 Kitsu Fetching: ${url}`); // Logging pode ser opcional para uma lib
  const startTime = Date.now();
  try {
    const data = await fetchWithRetry(url, {
      ...options,
      headers: {
        ...KITSU_API_HEADERS,
        ...options?.headers,
      },
    });
    const elapsedTime = Date.now() - startTime;
    // console.log(`⏱️ Kitsu Request took ${elapsedTime}ms`);
    return data;
  } catch (error) {
    const elapsedTime = Date.now() - startTime;
    console.error(`❌ Kitsu Error after ${elapsedTime}ms:`, error);
    throw error;
  }
};

/**
 * Safe API call wrapper 
 */
export async function safeKitsuApiCall<T>(fn: () => Promise<T>, fallbackValue: T): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    console.error("Kitsu API call failed:", error);
    // Em uma biblioteca, você pode querer apenas relançar o erro
    // ou ter um sistema de logging/callback de erro configurável.
    // Por simplicidade, retornamos o fallback.
    return fallbackValue;
  }
}
