
// Este arquivo agora reexporta o serviço manhwa-api aprimorado
// Este arquivo agora reexporta o serviço manhwa-api aprimorado
import { manhwaApi } from "./manhwa-api";

// Exportar a API aprimorada como a API padrão
export const api = manhwaApi;


export { mapKitsuToManhwa, isKoreanContent } from "@/utils/data-transform";
