/**
 * Conto per il ritiro credito. L'IBAN COMPLETO non esce mai dal
 * backend: arriva gia' mascherato ("IT60 **** 3456", primi 4 +
 * ultimi 4). Niente update per design — un IBAN sbagliato si
 * rimuove e se ne inserisce uno nuovo, perche' i prelievi gia'
 * eseguiti referenziano il vecchio e devono continuare a dire
 * la verita' (regola del ledger).
 */
export interface ContoBancarioDTO {
  id: number;
  intestatario: string;
  ibanMascherato: string;
  bic: string | null;
}