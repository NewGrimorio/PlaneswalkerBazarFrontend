// modelli/stampa-dto.ts
export interface StampaDTO {
  id: number;
  cartaId: number;
  cartaNome: string;
  espansioneId: number;
  espansioneCodice: string;
  espansioneNome: string;
  numeroCollezione: string;
  /** Id Gatherer (null: la stampa non e' sul database Wizards). */
  multiverseId: number | null;
  /** Id Scryfall della stampa: serve per l'immagine del retro. */
  scryfallId: string | null;
  rarita: string;
  artista: string | null;
  promo: boolean;
  hasNonFoil: boolean;
  hasFoil: boolean;
  hasEtchedFoil: boolean;
  effettiCornice: string | null;
  tipiPromo: string | null;
  imageUrl: string | null;
}