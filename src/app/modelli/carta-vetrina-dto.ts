// modelli/carta-vetrina-dto.ts
export interface CartaVetrinaDTO {
  id: number;
  nome: string;
  slug: string;
  imageUrl: string | null;
  numeroCollezione: string;
  rarita: string;
  /** Sottoinsieme ordinato di "WUBRG": "" = incolore, >1 = multicolore. */
  colori: string;
  espansioneCodice: string;
  espansioneNome: string;
  prezzoDa: number | null;
}