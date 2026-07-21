export interface VoceCarrelloDTO {
  id: number;
  skuId: number;
  nomeProdotto: string;
  tipoProdotto: string;
  condizione: string;
  lingua: string;
  finitura: string;
  imageUrl: string | null;
  prezzoUnitario: number;
  quantita: number;
  subtotale: number;
  disponibile: boolean;
}