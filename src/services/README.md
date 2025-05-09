# Hallyutoons Kitsu API Client

Este é um cliente TypeScript para interagir com a [Kitsu.io API](https://kitsu.docs.apiary.io/), focado em buscar dados de mangás e manhwas. Este código é uma parte da lógica de busca de dados utilizada pelo projeto [Hallyutoons](https://hallyutoons.site).

## Propósito

O objetivo deste repositório é mostrar como o Hallyutoons interage com a API da Kitsu para obter informações sobre manhwas, incluindo:

*   Busca de títulos.
*   Obtenção de detalhes de um manhwa específico.
*   Listagem e filtragem por gênero.
*   Transformação dos dados da Kitsu para um formato `Manhwa` padronizado.

**Este repositório NÃO contém o código completo do frontend do Hallyutoons nem a integração com o Backend (autenticação, favoritos, etc.).**

## Estrutura

*   `src/types/manhwa.ts`: Definições de tipo para a estrutura de dados `Manhwa`.
*   `src/config/api.config.ts`: Configurações básicas da API Kitsu.
*   `src/services/kitsu.ts`: Lógica principal para fazer chamadas à API Kitsu.
*   `src/utils/`: Funções utilitárias para chamadas API e transformação de dados.

## Como Usar (Exemplo Conceitual)

```typescript
import { kitsuApi } from './src/services/kitsu';

async function exempleUsage() {
  // Buscar manhwas
  const searchResults = await kitsuApi.searchManhwas("Solo Leveling");
  console.log("Resultados da Busca:", searchResults);

  // Obter detalhes de um manhwa (use um ID válido da Kitsu)
  if (searchResults.length > 0) {
    const details = await kitsuApi.getManhwaDetails(searchResults[0].id);
    console.log("Detalhes do Manhwa:", details);
  }

  // Listar manhwas populares
  const popularManhwas = await kitsuApi.getManhwasList(1, 5, "-userCount");
  console.log("Manhwas Populares:", popularManhwas.data);

  // Filtrar por gênero
  const actionManhwas = await kitsuApi.filterManhwasByGenre("Action", 1, 5);
  console.log("Manhwas de Ação:", actionManhwas.data);
}

exempleUsage();
