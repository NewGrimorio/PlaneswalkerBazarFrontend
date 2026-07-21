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

  // Popolati solo nella vista admin (storico globale)
  utenteId?: number | null;
  utenteUsername?: string | null;
  utenteNome?: string | null;
}