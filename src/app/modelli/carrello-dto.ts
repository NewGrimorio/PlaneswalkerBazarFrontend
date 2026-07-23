import { VoceCarrelloDTO } from './voce-carrello-dto';

export interface OpzioneSpedizioneDTO {
  tipo: string;              // STANDARD | EXPRESS
  etichetta: string;
  tempi: string;
  costo: number;             // 0 se offerta
  totaleConSpedizione: number;
}

export interface CarrelloDTO {
  id: number;
  voci: VoceCarrelloDTO[];
  totale: number;            // solo MERCE, spedizione esclusa
  numeroArticoli: number;

  spedizioneOfferta: boolean;
  mancaPerSpedizioneGratuita: number;
  opzioniSpedizione: OpzioneSpedizioneDTO[];
}