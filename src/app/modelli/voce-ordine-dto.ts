/**
 * Riga d'ordine: SNAPSHOT del checkout (descrizione e prezzo congelati),
 * non lo SKU vivo. skuId resta per tracciabilita'/reso.
 */
export interface VoceOrdineDTO {
  id: number;
  skuId: number | null;
  descrizione: string;
  prezzoUnitario: number;
  quantita: number;
  subtotale: number;
}