/**
 * Riga d'ordine: SNAPSHOT del checkout (descrizione e prezzo congelati),
 * non lo SKU vivo. skuId resta per tracciabilita'/reso.
 * prodottoId/prodottoNome sono identita' VIVA: arrivano solo nel
 * dettaglio e alimentano il flusso recensioni (quale prodotto recensire).
 */
export interface VoceOrdineDTO {
  id: number;
  skuId: number | null;
  descrizione: string;
  prezzoUnitario: number;
  quantita: number;
  subtotale: number;

  prodottoId?: number | null;
  prodottoNome?: string | null;
}