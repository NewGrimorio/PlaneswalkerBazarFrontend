export interface ProdottoDTO {
  id: number;
  tipoProdotto: string;
  nome: string;
  slug: string;
  descrizione: string | null;
  imageUrl: string | null;
  attivo: boolean;
  espansioneId: number | null;
  espansioneNome: string | null;
}
