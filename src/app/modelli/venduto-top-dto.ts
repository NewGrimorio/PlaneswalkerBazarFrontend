/**
 * Riga della classifica "piu' venduti". tipo = "CARTA" (varie versioni
 * sommate) oppure il TipoProdotto (BOOSTER_BOX, ...). ricavo arriva
 * SOLO dall'endpoint admin; nel pubblico e' assente.
 */
export interface VendutoTopDTO {
  tipo: string;
  nome: string;
  slug: string | null;
  imageUrl: string | null;
  quantita: number;
  ricavo?: number | null;
}