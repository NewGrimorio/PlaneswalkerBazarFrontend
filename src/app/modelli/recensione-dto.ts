export interface RecensioneDTO {
  id: number;
  voto: number;
  titolo: string | null;
  testo: string | null;
  stato: string;               // IN_ATTESA, APPROVATA, RIFIUTATA
  autore: string;
  acquistoVerificato: boolean;
  creationDate: string;
  updateDate: string;

  // Popolati solo nella vista admin (moderazione)
  prodottoId?: number | null;
  prodottoNome?: string | null;
}