import { VoceCarrelloDTO } from './voce-carrello-dto';

/** Il totale e numeroArticoli li calcola il backend: mai il client. */
export interface CarrelloDTO {
  id: number;
  voci: VoceCarrelloDTO[];
  totale: number;
  numeroArticoli: number;
}