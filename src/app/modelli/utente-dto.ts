export interface UtenteDTO {
  id: number;
  email: string;
  ruolo: string;
  nome: string;
  cognome: string;
  telefono: string | null;
  dataNascita: string | null;      // le date JSON arrivano come stringhe
  codiceFiscale: string | null;
  dataRegistrazione: string;
}