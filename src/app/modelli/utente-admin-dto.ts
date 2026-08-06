/** Vista ADMIN dell'utente (V18): a differenza di UtenteDTO espone
 *  email e stato. Stato e ruolo come stringhe: il frontend non
 *  conosce gli enum del backend. */
export interface UtenteAdminDTO {
  id: number;
  email: string;
  username: string;
  ruolo: string;                    // 'ADMIN' | 'CLIENTE'
  stato: string;                    // 'ATTIVO' | 'DISATTIVATO' | 'BANNATO'
  nome: string;
  cognome: string;
  telefono: string | null;
  dataRegistrazione: string;        // le date JSON arrivano come stringhe
}

/** Pagina della lista utenti: righe + totale per il paginatore. */
export interface PaginaUtentiDTO {
  totale: number;
  pagina: number;
  dimensione: number;
  utenti: UtenteAdminDTO[];
}

/** Riga della timeline del ledger storico_stato_utente.
 *  eseguitoDaId confrontato con l'id dell'utente della riga distingue
 *  "provvedimento admin" da "azione dell'utente stesso". */
export interface StoricoStatoUtenteDTO {
  id: number;
  statoDa: string;
  statoA: string;
  motivo: string | null;
  eseguitoDaId: number | null;
  eseguitoDaUsername: string;
  creationDate: string;
}