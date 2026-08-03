export interface RecensioneDTO {
  id: number;
  voto: number;
  titolo: string | null;
  testo: string | null;
  stato: string;               // IN_ATTESA, APPROVATA, RIFIUTATA
  autore: string;
  /** Avatar del profilo (url relativo), null se l'utente non l'ha caricato. */
  autoreImmagine: string | null;
  acquistoVerificato: boolean;
  creationDate: string;
  updateDate: string;

  // Popolati solo nella vista arricchita (moderazione admin / le mie).
  // ordineId serve a riaprire la recensione in modifica: il salvataggio
  // esige l'ordine che ne giustifica il diritto.
  prodottoId?: number | null;
  prodottoNome?: string | null;
  ordineId?: number | null;
}
/** Media e conteggio per la testata della sezione recensioni. */
export interface RecensioneStatisticheDTO {
  media: number | null;
  conteggio: number;
}