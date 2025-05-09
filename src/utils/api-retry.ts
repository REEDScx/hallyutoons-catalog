
/**
 * Utility for handling API retries and backoff
 */

/**
 * Retry a function with exponential backoff
 * 
 * @param fn Function to retry
 * @param retriesLeft Number of retries left
 * @param delay Initial delay in ms
 * @param onRetry Callback on retry
 * @returns Promise with the function result
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retriesLeft = 3,
  delay = 1000,
  onRetry?: (retriesLeft: number, error: any) => void
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retriesLeft <= 0) {
      console.error("Max retries reached:", error);
      throw error;
    }
    
    // Log the retry
    console.log(`Retrying API call, ${retriesLeft} attempts left. Error:`, error);
    if (onRetry) {
      onRetry(retriesLeft, error);
    }
    
    // Wait for backoff period
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Retry with exponential backoff
    return retryWithBackoff(fn, retriesLeft - 1, delay * 1.5, onRetry);
  }
}

/**
 * Adds rate limit handling to a fetch call
 * 
 * @param url URL to fetch
 * @param options Fetch options
 * @returns Response from fetch
 */
export async function fetchWithRetry(url: string, options?: RequestInit): Promise<any> {
  return retryWithBackoff(
    async () => {
      const response = await fetch(url, options);
      
      // Handle rate limiting with 429 status
      if (response.status === 429) {
        // Try to get retry-after header
        const retryAfter = response.headers.get('retry-after');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
        
        console.warn(`Rate limited! Waiting for ${waitTime}ms before retrying...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        // Retry after waiting
        throw new Error('Rate limited, retry after waiting');
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      return response.json();
    },
    3, // 3 retries
    1000 // Initial 1s delay
  );
}
