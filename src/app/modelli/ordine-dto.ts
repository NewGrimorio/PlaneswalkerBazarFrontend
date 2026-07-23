import { VoceOrdineDTO } from './voce-ordine-dto';

/**
 * Ordine. L'indirizzo e' lo SNAPSHOT del checkout (campi sped_*), non
 * un IndirizzoDTO dalla rubrica: mostra dove e' stato DAVVERO spedito.
 * Le voci sono presenti solo nel dettaglio cliente, assenti nelle liste
 * (per questo opzionali). I campi oltre i primi tre sono opzionali
 * perche' la conferma di checkout ne usa solo tre.
 */
export interface OrdineDTO {
  id: number;
  stato: string;
  totale: number;

  speseSpedizione?: number;
  spedDestinatario?: string;
  spedVia?: string;
  spedCivico?: string;
  spedCap?: string;
  spedCitta?: string;
  spedProvincia?: string | null;
  spedNazione?: string;

  creationDate?: string;
  updateDate?: string;
  tipoSpedizione?: string;

  voci?: VoceOrdineDTO[];
}