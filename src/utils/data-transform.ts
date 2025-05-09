// src/utils/data-transform.ts
import { Manhwa, ManhwaStatus } from "../types/manhwa";
import { FALLBACK_IMAGE_URL, KOREAN_INDICATORS_EXAMPLES } from "../config/api.config";

// Simples sanitizador de texto para uma biblioteca (pode ser mais robusto se necessário)
const sanitizeTextLib = (text: string | null | undefined): string => {
  if (typeof text !== 'string') return '';
  return text.replace(/[<>]/g, ''); // Exemplo simples, ajuste conforme necessário
};

export const mapKitsuToManhwa = (item: any): Manhwa => {
  try {
    if (!item || !item.attributes) {
      console.error("Invalid Kitsu item for mapping", item);
      return createInternalFallbackManhwa("api-item-error");
    }

    const attrs = item.attributes;
    const posterImage = attrs.posterImage?.original ||
                        attrs.posterImage?.large ||
                        attrs.posterImage?.medium ||
                        FALLBACK_IMAGE_URL;

    let genresApi = [];
    try {
      genresApi = (item.relationships?.genres?.data?.map((g: any) => g.id /* ou g.attributes.name se disponível e preferido */) || ["Unknown Genre"])
                  .filter(Boolean)
                  .map(sanitizeTextLib);
    } catch (e) { genresApi = ["Unknown Genre"]; }

    let authorsApi = ["Unknown Author"];
    // Kitsu geralmente não tem "authors" diretamente como manhwas,
    // pode ser staff com role "author" ou "story", ou um campo customizado.
    // Esta é uma simplificação. Você precisaria adaptar se Kitsu tiver dados de autor melhores.
    // No seu código original, você usava `item.attributes.authorNames` ou `item.attributes.author`
    // Se esses campos existem na resposta da Kitsu que você recebe, use-os:
    if (attrs.authorNames && Array.isArray(attrs.authorNames) && attrs.authorNames.length > 0) {
        authorsApi = attrs.authorNames.map(sanitizeTextLib);
    } else if (attrs.author) {
        authorsApi = [sanitizeTextLib(attrs.author)];
    }


    const id = item.id || `generated-${Date.now()}`;
    let rating = 0;
    if (attrs.averageRating) {
      const parsedRating = parseFloat(attrs.averageRating);
      if (!isNaN(parsedRating)) {
        rating = Math.max(0, Math.min(5, parsedRating / 20)); // Kitsu rating é 0-100
      }
    }

    return {
      id: id,
      title: sanitizeTextLib(attrs.canonicalTitle || attrs.titles?.en_jp || attrs.titles?.en || "Untitled"),
      description: sanitizeTextLib(attrs.synopsis || "No description available."),
      coverImage: posterImage,
      authors: authorsApi,
      genres: genresApi,
      rating: rating,
      status: mapKitsuStatus(attrs.status),
      releaseDate: sanitizeTextLib(attrs.startDate || "Unknown"),
      updatedAt: sanitizeTextLib(attrs.updatedAt || attrs.createdAt || new Date().toISOString()),
    };
  } catch (error) {
    console.error("Error mapping Kitsu data to Manhwa:", error);
    return createInternalFallbackManhwa("mapping-error");
  }
};

export const mapKitsuStatus = (status?: string): ManhwaStatus => {
  switch (status?.toLowerCase()) {
    case "current": return ManhwaStatus.Ongoing;
    case "finished": return ManhwaStatus.Completed;
    case "on_hiatus": return ManhwaStatus.Hiatus; // Kitsu usa on_hiatus
    case "cancelled": return ManhwaStatus.Cancelled; // Kitsu usa cancelled
    case "upcoming": return ManhwaStatus.Ongoing; // ou um novo status "Upcoming"
    default: return ManhwaStatus.Ongoing; // Ou ManhwaStatus.Hiatus se preferir para desconhecido
  }
};

export const createInternalFallbackManhwa = (errorType: string = "unknown"): Manhwa => ({
  id: `error-${errorType}-${Date.now()}`,
  title: "Data Unavailable",
  description: "Could not load manhwa data.",
  coverImage: FALLBACK_IMAGE_URL,
  authors: ["Unknown"],
  genres: ["Error"],
  rating: 0,
  status: ManhwaStatus.Hiatus,
  releaseDate: "Unknown",
  updatedAt: new Date().toISOString(),
});

// Esta função se torna mais um exemplo de como você *poderia* filtrar do que uma regra estrita
// em um cliente de API genérico.
export const isLikelyKoreanContent = (item: any): boolean => {
  if (!item || !item.attributes) return false;
  if (item.attributes.subtype?.toLowerCase() === "manhwa") return true;
  if (item.attributes.titles?.ko_kr) return true;

  const title = (item.attributes.canonicalTitle || "").toLowerCase();
  const synopsis = (item.attributes.synopsis || "").toLowerCase();

  return KOREAN_INDICATORS_EXAMPLES.some(indicator =>
    title.includes(indicator) || synopsis.includes(indicator)
  );
};

export const normalizeSearchText = (text: string): string => {
  if (typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .trim();
};
