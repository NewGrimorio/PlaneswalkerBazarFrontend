// modelli/carta-dto.ts
export interface CartaDTO {
  id: number;
  nome: string;
  costoMana: string | null;
  valoreMana: number | null;
  tipoRiga: string | null;
  testoOracle: string | null;
  forza: string | null;
  costituzione: string | null;
  colori: string;
  identitaColore: string;
  paroleChiave: string | null;
  legal: string | null;           // JSON grezzo {"standard":"legal",...}
}