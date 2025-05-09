
import { Manhwa, ManhwaResponse } from "../types/manhwa";
import { fetchWithTimeout, buildUrl, safeApiCall } from "../utils/api-helpers";
import { sanitizeText, sanitizeUrlParam } from "../utils/security";
import { mapKitsuToManhwa, isKoreanContent, scoreSearchRelevance, createFallbackManhwa } from "../utils/data-transform";
import { API_BASE_URL, PREDEFINED_GENRES } from "../config/api.config";

// Cache for search results to improve performance
const searchCache = new Map<string, { timestamp: number, data: Manhwa[] }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Clear expired cache entries
 */
const clearExpiredCache = () => {
  const now = Date.now();
  for (const [key, value] of searchCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      searchCache.delete(key);
    }
  }
};

/**
 * Enhanced Manhwa API service
 */
export const manhwaApi = {
  /**
   * Get featured manhwas for the homepage
   */
  getFeaturedManhwas: async (): Promise<Manhwa[]> => {
    return safeApiCall(async () => {
      console.log("🔍 Fetching featured manhwas");
      
      const url = buildUrl(`${API_BASE_URL}/manga`, {
        'sort': '-popularityRank',
        'page[limit]': 3
      });
      
      console.log(`📡 API Request URL: ${url}`);
      const data = await fetchWithTimeout(url);
      
      console.log(`📦 Received ${data.data?.length || 0} items`);
      
      // We're using a less restrictive filter now - showing all manga
      const results = data.data.map(mapKitsuToManhwa);
      
      console.log(`✅ Returning ${results.length} featured manhwas`);
      return results;
    }, [createFallbackManhwa()]);
  },

  /**
   * Get all manhwas with pagination and optional sorting
   */
  getManhwas: async (
    page: number = 1, 
    limit: number = 10, 
    sort: string = "-userCount"
  ): Promise<ManhwaResponse> => {
    return safeApiCall(async () => {
      console.log(`🔍 Fetching manhwas (page ${page}, limit ${limit}, sort ${sort})`);
      
      const sanitizedSort = sanitizeUrlParam(sort);
      const offset = (page - 1) * limit;
      
      const url = buildUrl(`${API_BASE_URL}/manga`, {
        'page[limit]': limit,
        'page[offset]': offset,
        'sort': sanitizedSort
      });
      
      console.log(`📡 API Request URL: ${url}`);
      const data = await fetchWithTimeout(url);
      
      console.log(`📦 Received ${data.data?.length || 0} items from API`);
      console.log(`📋 API metadata:`, data.meta);
      
      // Using less restrictive filtering - show all items
      const filteredData = data.data;
      const manhwas = filteredData.map(mapKitsuToManhwa);
      
      // Make sure pagination data is being calculated correctly
      const totalPages = Math.max(1, Math.ceil((data.meta?.count || 0) / limit));
      const totalItems = data.meta?.count || 0;
      
      console.log(`✅ Returning ${manhwas.length} manhwas (total pages: ${totalPages}, total items: ${totalItems})`);
      
      return {
        data: manhwas,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: totalItems,
        },
      };
    }, {
      data: [createFallbackManhwa()],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 1,
      },
    });
  },

  /**
   * Get manhwa by id
   */
  getManhwaById: async (id: string): Promise<Manhwa | null> => {
    return safeApiCall(async () => {
      console.log(`🔍 Fetching manhwa by ID: ${id}`);
      
      if (!id || id === 'undefined') {
        throw new Error('Invalid ID provided');
      }
      
      const sanitizedId = sanitizeUrlParam(id);
      const url = buildUrl(`${API_BASE_URL}/manga/${sanitizedId}`);
      
      console.log(`📡 API Request URL: ${url}`);
      const data = await fetchWithTimeout(url);
      
      console.log(`📦 Received manhwa data: ${data?.data?.id || 'none'}`);
      
      return mapKitsuToManhwa(data.data);
    }, null);
  },

  /**
   * Enhanced search for manhwas with caching and relevance scoring
   */
  searchManhwas: async (query: string): Promise<Manhwa[]> => {
    if (!query?.trim()) return [];
    
    console.log(`🔍 Searching for: "${query}"`);
    
    // Check cache first
    const cacheKey = query.toLowerCase().trim();
    const cachedResult = searchCache.get(cacheKey);
    
    if (cachedResult && (Date.now() - cachedResult.timestamp < CACHE_TTL)) {
      console.log(`🔍 Using cached search results for: ${query}`);
      return cachedResult.data;
    }
    
    // Clear expired cache entries
    clearExpiredCache();
    
    return safeApiCall(async () => {
      const sanitizedQuery = sanitizeUrlParam(query);
      
      // Search directly
      const mainUrl = buildUrl(`${API_BASE_URL}/manga`, {
        'filter[text]': encodeURIComponent(sanitizedQuery),
        'page[limit]': 20
      });
      
      console.log(`📡 API Request URL: ${mainUrl}`);
      
      const data = await fetchWithTimeout(mainUrl);
      
      console.log(`📦 Received ${data.data?.length || 0} search results`);
      
      // Score results but don't filter strictly by Korean content
      let scoredResults = data.data
        .map((item: any) => ({ 
          item, 
          score: scoreSearchRelevance(item, query)
        }))
        .sort((a: any, b: any) => b.score - a.score);
      
      // Get top results
      const results = scoredResults
        .map((r: any) => r.item);
      
      // If we have too few results, run a broader search
      if (results.length < 5) {
        console.log(`⚠️ Few results found, trying broader search`);
        
        // Try searching by keywords
        const searchTerms = sanitizedQuery.split(" ").filter((t: string) => t.length > 2);
        
        if (searchTerms.length > 0) {
          const promises = searchTerms.map(async (term: string) => {
            const secondaryUrl = buildUrl(`${API_BASE_URL}/manga`, {
              'filter[categories]': 'manga',
              'page[limit]': 10
            });
            
            console.log(`📡 Additional search URL: ${secondaryUrl}`);
            
            const secondaryData = await fetchWithTimeout(secondaryUrl);
            return secondaryData.data.filter((item: any) => 
              scoreSearchRelevance(item, term) > 0
            );
          });
          
          // Get results from additional searches
          const additionalResults = (await Promise.all(promises)).flat();
          
          console.log(`📦 Found ${additionalResults.length} additional results`);
          
          // Add unique results
          additionalResults.forEach((item: any) => {
            if (!results.some(existing => existing.id === item.id)) {
              results.push(item);
            }
          });
        }
      }
      
      // Map to Manhwa objects
      const finalResults = results.map(mapKitsuToManhwa);
      
      console.log(`✅ Returning ${finalResults.length} search results`);
      
      // Save to cache
      searchCache.set(cacheKey, {
        timestamp: Date.now(),
        data: finalResults
      });
      
      return finalResults;
    }, []);
  },

  /**
   * Filter manhwas by genre with improved detection
   */
  filterByGenre: async (
    genre: string, 
    page: number = 1, 
    limit: number = 20
  ): Promise<ManhwaResponse> => {
    if (!genre?.trim()) {
      return {
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
        }
      };
    }
    
    console.log(`🔍 Filtering by genre: "${genre}" (page ${page})`);
    
    return safeApiCall(async () => {
      const sanitizedGenre = sanitizeUrlParam(genre);
      const offset = (page - 1) * limit;
      
      // Use more targeted API call
      const url = buildUrl(`${API_BASE_URL}/manga`, {
        'filter[categories]': encodeURIComponent(sanitizedGenre),
        'page[limit]': limit,
        'page[offset]': offset,
        'sort': '-userCount'
      });
      
      console.log(`📡 API Request URL: ${url}`);
      
      const data = await fetchWithTimeout(url);
      
      console.log(`📦 Received ${data.data?.length || 0} items for genre "${genre}"`);
      console.log(`📋 Genre filter metadata:`, data.meta);
      
      // Using less restrictive filtering - show all items for this genre
      const filteredData = data.data;
      
      const totalPages = Math.ceil((data.meta?.count || filteredData.length) / limit) || 1;
      const totalItems = data.meta?.count || filteredData.length;
      
      console.log(`✅ Returning ${filteredData.length} items (total pages: ${totalPages}, total items: ${totalItems})`);
      
      return {
        data: filteredData.map(mapKitsuToManhwa),
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: totalItems,
        }
      };
    }, {
      data: [],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
      }
    });
  },

  /**
   * Get available genres - Returns predefined list
   */
  getGenres: async (): Promise<string[]> => {
    // Return predefined genres for better relevance to manhwa
    return PREDEFINED_GENRES;
  },
};
