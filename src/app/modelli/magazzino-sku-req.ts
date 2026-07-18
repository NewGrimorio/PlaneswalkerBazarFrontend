export interface MagazzinoSKUReq {
  prodottoId: number;
  lingua: string;
  prezzo: number;
  quantita: number;
  condizione?: string;
  finitura?: string;
}