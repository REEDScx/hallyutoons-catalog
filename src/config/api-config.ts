// src/config/api.config.ts

/**
 * Kitsu API Configuration
 */
export const KITSU_API_BASE_URL = "https://kitsu.io/api/edge";
export const API_TIMEOUT = 10000; // API Timeout in milliseconds

// Common API headers for Kitsu
export const KITSU_API_HEADERS = {
  'Accept': 'application/vnd.api+json',
  'Content-Type': 'application/vnd.api+json'
};

// Genres that might be relevant for filtering or display,
// similar to what Hallyutoons might use.
export const RELEVANT_GENRES = [
  "Action", "Romance", "Fantasy", "Comedy", "Drama",
  "Slice of Life", "Horror", "Mystery", "Supernatural",
  "School Life", "Adventure", "Martial Arts", "Historical",
  "Thriller", "Sci-Fi", "Psychological", "Sports", "Tragedy",
  "BL", "GL", "Harem", "Isekai", "System", "Cultivation",
  "Reincarnation", "Tower Climbing", "Murim", "Regression",
  "Dungeons", "Revenge", "Game", "Modern", "Monsters"
];

// Indicators that might be used in data transformation to identify content type.
// Note: The effectiveness of these for strictly "Korean" content can vary.
export const KOREAN_INDICATORS_EXAMPLES = [
  'korea',
  'korean',
  'manhwa',
  'webtoon',
  'manhua',
  'seoul',
  'busan'
];

// Fallback image for missing images
export const FALLBACK_IMAGE_URL = "https://images.unsplash.com/photo-1610018556010-6a11691bc905?q=80&w=1000&auto=format&fit=crop";
