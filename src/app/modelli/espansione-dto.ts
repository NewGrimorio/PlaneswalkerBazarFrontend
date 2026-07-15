export interface EspansioneDTO {
  id: number;
  codice: string;
  nome: string;
  tipoSet: string;
  codiceSetPadre: string | null;
  dataUscita: string | null;
  iconUrl: string | null;
  numeroCarte: number | null;
  dataUltimaSincronizzazione: string | null;
  
}
