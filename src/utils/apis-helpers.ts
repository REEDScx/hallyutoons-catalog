
import { fetchWithRetry } from "./api-retry";
import { toast } from "@/hooks/use-toast";

/**
 * Builds a URL with parameters
 * @param baseUrl Base URL string
 * @param params Object of key-value parameters
 * @returns Formatted URL string with parameters
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
 * Busca aprimorada com tempo limite e registro
 * @param url URL to fetch
 * @param options Fetch options
 * @returns Promise with parsed JSON response
 */
export const fetchWithTimeout = async (url: string, options?: RequestInit, timeoutMs: number = 15000): Promise<any> => {
  console.log(`🌐 Fetching: ${url}`);
  const startTime = Date.now();
  
  try {
    // Use nosso novo utilitário fetchWithRetry
    const data = await fetchWithRetry(url, {
      ...options,
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        ...options?.headers,
      },
    });
    
    const elapsedTime = Date.now() - startTime;
    console.log(`⏱️ Request took ${elapsedTime}ms`);
    console.log(`✅ Response received successfully`);
    
    return data;
  } catch (error) {
    const elapsedTime = Date.now() - startTime;
    console.error(`❌ Error after ${elapsedTime}ms:`, error);
    throw error;
  }
};

/**
 * Wrapper de chamada de API seguro com tratamento de erros e fallbacks
 * Aprimorado com notificação ao usuário
 * @param Função fn Async para executar
 * @param fallbackValue Fallback Resultado da função ou valor de fallback
 * @returns Resultado da função ou valor de fallback
 */
export async function safeApiCall<T>(fn: () => Promise<T>, fallbackValue: T): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    console.error("API call failed:", error);
    
    // Show a toast notification for API errors
    toast({
      title: "Erro na API",
      description: error?.message || "Ocorreu um erro ao buscar os dados. Por favor, tente novamente mais tarde.",
      variant: "destructive"
    });
    
    return fallbackValue;
  }
}
