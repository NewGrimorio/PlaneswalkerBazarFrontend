// modelli/stampa-dto.ts
export interface StampaDTO {
  id: number;
  cartaId: number;
  cartaNome: string;
  espansioneId: number;
  espansioneCodice: string;
  espansioneNome: string;
  numeroCollezione: string;
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