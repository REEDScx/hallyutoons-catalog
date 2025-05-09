// src/services/kitsu.ts
import { Manhwa, ManhwaResponse } from "../types/manhwa"; // Supondo que ManhwaResponse seja mantido
import { fetchKitsuWithTimeout, buildUrl, safeKitsuApiCall } from "../utils/api-helpers";
import { mapKitsuToManhwa, createInternalFallbackManhwa, normalizeSearchText, isLikelyKoreanContent } from "../utils/data-transform";
import { KITSU_API_BASE_URL, RELEVANT_GENRES } from "../config/api.config";

// Função para sanitizar parâmetros de URL (pode vir de um utils/security.ts se você criar um)
const sanitizeUrlParamLib = (param: string): string => {
  if (typeof param !== 'string') return '';
  return param.replace(/[<>&"'\\]/g, '');
};

export const kitsuApi = {
  getManhwasList: async (
    page: number = 1,
    limit: number = 10,
    sort: string = "-userCount" // Popular Kitsu sort field
  ): Promise<ManhwaResponse> => {
    return safeKitsuApiCall(async () => {
      const sanitizedSort = sanitizeUrlParamLib(sort);
      const offset = (page - 1) * limit;

      const url = buildUrl(`${KITSU_API_BASE_URL}/manga`, {
        'page[limit]': limit,
        'page[offset]': offset,
        'sort': sanitizedSort,
        // 'filter[categories]': 'manhwa' // Adicionar este filtro se quiser apenas manhwas
      });

      const response = await fetchKitsuWithTimeout(url);
      const manhwas = (response.data || []).map(mapKitsuToManhwa);

      // Kitsu meta.count dá o total de itens para aquela query específica
      const totalItems = response.meta?.count || 0;
      const totalPages = Math.max(1, Math.ceil(totalItems / limit));

      return {
        data: manhwas,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: totalItems,
        },
      };
    }, {
      data: [createInternalFallbackManhwa("api-error")],
      pagination: { currentPage: 1, totalPages: 1, totalItems: 1 },
    });
  },

  getManhwaDetails: async (id: string): Promise<Manhwa | null> => {
    return safeKitsuApiCall(async () => {
      if (!id || id === 'undefined' || id === 'null') {
        throw new Error('Invalid ID provided to Kitsu API client');
      }
      const sanitizedId = sanitizeUrlParamLib(id);
      const url = buildUrl(`${KITSU_API_BASE_URL}/manga/${sanitizedId}`, {
        'include': 'genres,staff.person' // Exemplo de inclusão de relações
      });
      const response = await fetchKitsuWithTimeout(url);
      return mapKitsuToManhwa(response.data);
    }, null);
  },

  searchManhwas: async (query: string, limit: number = 20): Promise<Manhwa[]> => {
    if (!query?.trim()) return [];
    return safeKitsuApiCall(async () => {
      const sanitizedQuery = normalizeSearchText(query); // Usa o normalizador de texto
      const url = buildUrl(`${KITSU_API_BASE_URL}/manga`, {
        'filter[text]': encodeURIComponent(sanitizedQuery), // Kitsu usa filter[text] para busca textual
        'page[limit]': limit,
        'sort': '-userCount' // Ou outro critério de relevância da Kitsu
      });
      const response = await fetchKitsuWithTimeout(url);
      // Você pode adicionar uma lógica de score aqui se desejar, similar ao seu original
      // ou apenas retornar os resultados filtrados por isLikelyKoreanContent
      return (response.data || [])
        // .filter(isLikelyKoreanContent) // Opcional: manter se quiser este filtro
        .map(mapKitsuToManhwa);
    }, []);
  },

  filterManhwasByGenre: async (
    genre: string,
    page: number = 1,
    limit: number = 10
  ): Promise<ManhwaResponse> => {
    if (!genre?.trim()) return { data: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0 } };
    return safeKitsuApiCall(async () => {
      const sanitizedGenre = sanitizeUrlParamLib(genre);
      const offset = (page - 1) * limit;
      const url = buildUrl(`${KITSU_API_BASE_URL}/manga`, {
        'filter[categories]': encodeURIComponent(sanitizedGenre), // Kitsu usa filter[categories] para gênero
        'page[limit]': limit,
        'page[offset]': offset,
        'sort': '-userCount'
      });
      const response = await fetchKitsuWithTimeout(url);
      const manhwas = (response.data || []).map(mapKitsuToManhwa);

      const totalItems = response.meta?.count || 0;
      const totalPages = Math.max(1, Math.ceil(totalItems / limit));

      return {
        data: manhwas,
        pagination: { currentPage: page, totalPages: totalPages, totalItems: totalItems },
      };
    }, {
      data: [],
      pagination: { currentPage: 1, totalPages: 1, totalItems: 0 },
    });
  },

  getAvailableGenres: async (): Promise<string[]> => {
    // Para um cliente Kitsu genérico, você poderia buscar os gêneros da API Kitsu
    // GET https://kitsu.io/api/edge/categories?page[limit]=0&sort=title
    // Mas, para manter a consistência com seu projeto, pode retornar a lista pré-definida.
    return Promise.resolve(RELEVANT_GENRES);
  },
};
