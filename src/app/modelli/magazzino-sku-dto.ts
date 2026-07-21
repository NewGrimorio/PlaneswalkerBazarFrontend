export interface MagazzinoSKUDTO {
  id: number;
  prodottoId: number;
  condizione: string;
  lingua: string;
  finitura: string;
  prezzo: number;
  quantita: number;
  attivo: boolean;
  disponibile: boolean;

  // Popolato solo nelle viste admin che uniscono il prodotto (es. restock)
  prodottoNome?: string | null;
}