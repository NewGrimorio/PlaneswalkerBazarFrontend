export interface MovimentoDTO {
  id: number;
  tipo: string;        // RICARICA, PRELIEVO, PAGAMENTO_ORDINE, RIMBORSO...
  metodo: string;      // BONIFICO, PAYPAL, INTERNO
  stato: string;       // IN_ATTESA, COMPLETATO, RIFIUTATO
  importo: number;
  commissione: number;
  riferimentoEsterno: string | null;
  descrizione: string | null;
  ordineId: number | null;
  contoBancarioId: number | null;
  creationDate: string;
  completionDate: string | null;
}