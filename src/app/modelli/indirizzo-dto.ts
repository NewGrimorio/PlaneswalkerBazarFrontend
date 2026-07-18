export interface IndirizzoDTO {
  id: number;
  etichetta: string | null;
  destinatario: string;
  via: string;
  civico: string;
  cap: string;
  citta: string;
  provincia: string | null;
  nazione: string | null;
  predefinito: boolean;
}