// modelli/carta-vetrina-dto.ts
export interface CartaVetrinaDTO {
  id: number;
  nome: string;
  slug: string;
  imageUrl: string | null;
  numeroCollezione: string;
  rarita: string;
  prezzoDa: number | null;
}