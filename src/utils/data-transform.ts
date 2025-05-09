import { Manhwa, ManhwaStatus } from "../types/manhwa";
import { sanitizeText } from "./security";
import { FALLBACK_IMAGE, KOREAN_INDICATORS } from "../config/api.config";

/**
 * Helper function to convert Kitsu API data to our Manhwa format
 * Enhanced with better error handling and validation
 */
export const mapKitsuToManhwa = (item: any): Manhwa => {
  try {
    // Handle null or undefined item
    if (!item || !item.attributes) {
      console.error("Invalid API response item", item);
      return createFallbackManhwa("api-error");
    }

    // Get the poster image with fallbacks
    const posterImage = item.attributes.posterImage?.original || 
                      item.attributes.posterImage?.large || 
                      item.attributes.posterImage?.medium || 
                      FALLBACK_IMAGE;

    // Get genres with validation
    let genres = [];
    try {
      genres = (item.relationships?.genres?.data?.map((g: any) => g.id) || ["Manhwa"])
               .filter(Boolean)
               .map(sanitizeText);
    } catch (error) {
      console.warn("Error processing genres:", error);
      genres = ["Manhwa"];
    }

    // Get authors with proper validation
    let authors = [];
    try {
      if (Array.isArray(item.attributes.authorNames) && item.attributes.authorNames.length > 0) {
        authors = item.attributes.authorNames;
      } else if (item.attributes.author) {
        authors = [item.attributes.author];
      } else {
        authors = ["Unknown"];
      }
    } catch (error) {
      console.warn("Error processing authors:", error);
      authors = ["Unknown"];
    }

    // Generate a safe ID if none exists
    const id = item.id || `generated-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Calculate rating safely
    let rating = 4.0;
    try {
      if (item.attributes.averageRating) {
        const parsedRating = parseFloat(item.attributes.averageRating);
        if (!isNaN(parsedRating)) {
          rating = parsedRating / 20;
          // Clamp between 0 and 5
          rating = Math.max(0, Math.min(5, rating));
        }
      }
    } catch (error) {
      console.warn("Error calculating rating:", error);
      // Keep default 4.0
    }

    return {
      id: id,
      title: sanitizeText(item.attributes.canonicalTitle || 
             item.attributes.titles?.en_jp || 
             item.attributes.titles?.en || 
             item.attributes.titles?.ko_kr ||
             "Untitled"),
      description: sanitizeText(item.attributes.synopsis || "No description available"),
      coverImage: posterImage,
      authors: authors,
      genres: genres,
      rating: rating,
      status: mapStatus(item.attributes.status),
      releaseDate: sanitizeText(item.attributes.startDate || "Unknown"),
      updatedAt: sanitizeText(item.attributes.updatedAt || item.attributes.createdAt || new Date().toISOString()),
    };
  } catch (error) {
    console.error("Critical error mapping Kitsu data to Manhwa:", error);
    return createFallbackManhwa("mapping-error");
  }
};

/**
 * Map Kitsu status to our status enum
 */
export const mapStatus = (status: string): ManhwaStatus => {
  switch (status?.toLowerCase()) {
    case "current":
      return ManhwaStatus.Ongoing;
    case "finished":
      return ManhwaStatus.Completed;
    case "tba":
      return ManhwaStatus.Hiatus;
    case "unreleased":
      return ManhwaStatus.Cancelled;
    default:
      return ManhwaStatus.Ongoing;
  }
};

/**
 * Create a fallback manhwa object for error cases
 * Enhanced with error type information
 */
export const createFallbackManhwa = (errorType: string = "unknown"): Manhwa => ({
  id: `error-${errorType}-${Date.now()}`,
  title: "Unable to Load Data",
  description: "There was an error loading the manhwa data. Please try again later.",
  coverImage: FALLBACK_IMAGE,
  authors: ["Unknown"],
  genres: ["Error"],
  rating: 0,
  status: ManhwaStatus.Hiatus,
  releaseDate: "Unknown",
  updatedAt: new Date().toISOString(),
});

/**
 * Detects if content is likely Korean-related based on various indicators
 * IMPROVED: Now returns true to make filtering less restrictive and show more content
 */
export const isKoreanContent = (item: any): boolean => {
  if (!item || !item.attributes) {
    console.log("Invalid item provided to isKoreanContent check");
    return false;
  }
  
  // Always return true to make the filter less restrictive and show all content
  return true;
  
  // The code below is intentionally commented out to make the filter less restrictive
  // We'll show all manga/manhwa content for now until we have better filtering
  /*
  // Check subtype directly
  if (item.attributes.subtype === "manhwa") return true;
  
  // Check for Korean title
  if (item.attributes.titles?.ko_kr) return true;
  
  // Check if any Korean indicators are in the title or description
  const title = (item.attributes.canonicalTitle || "").toLowerCase();
  const synopsis = (item.attributes.synopsis || "").toLowerCase();
  
  // Check title and synopsis
  return KOREAN_INDICATORS.some(indicator => 
    title.includes(indicator) || synopsis.includes(indicator)
  );
  */
};

/**
 * Normalize text for search purposes
 */
export const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^\w\s]/g, '') // Remove special characters
    .trim();
};

/**
 * Score search relevance based on multiple factors
 * Enhanced with additional error handling
 */
export const scoreSearchRelevance = (item: any, query: string): number => {
  if (!item || !item.attributes) return 0;
  if (!query || typeof query !== 'string') return 0;
  
  try {
    const normalizedQuery = normalizeText(query);
    const normalizedTitle = normalizeText(item.attributes.canonicalTitle || "");
    const normalizedSynopsis = normalizeText(item.attributes.synopsis || "");
    
    let score = 0;
    
    // Exact title match gives highest score
    if (normalizedTitle === normalizedQuery) {
      score += 100;
    }
    // Title starts with query
    else if (normalizedTitle.startsWith(normalizedQuery)) {
      score += 75;
    }
    // Title includes query
    else if (normalizedTitle.includes(normalizedQuery)) {
      score += 50;
    }
    
    // Contains in synopsis
    if (normalizedSynopsis.includes(normalizedQuery)) {
      score += 25;
    }
    
    // Bonus for popularity
    if (item.attributes.popularityRank && typeof item.attributes.popularityRank === 'number') {
      score += Math.max(0, 10 - Math.floor(item.attributes.popularityRank / 1000));
    }
    
    // Bonus for Korean content
    if (isKoreanContent(item)) {
      score += 20;
    }
    
    return score;
  } catch (error) {
    console.error("Error scoring search relevance:", error);
    return 0;
  }
};

/**
 * A simple function to check if the API response is valid
 */
export const isValidApiResponse = (data: any): boolean => {
  if (!data) return false;
  if (!Array.isArray(data.data) && !data.data) return false;
  return true;
};
