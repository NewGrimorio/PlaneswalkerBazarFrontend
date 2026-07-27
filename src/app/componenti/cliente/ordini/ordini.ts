import { Component, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DecimalPipe, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Ordine } from '../../../services/ordine';
import { OrdineDTO } from '../../../modelli/ordine-dto';
import { StoricoStatoOrdineDTO } from '../../../modelli/storico-stato-ordine-dto';

type Toast = { testo: string; errore: boolean } | null;

/** Un'azione disponibile su un ordine, con la conferma da chiedere. */
interface Azione {
  path: string;
  label: string;
  icona: string;
  conferma?: string;
  distruttiva?: boolean;
}

/**
 * "I miei ordini": lista + dettaglio a scomparsa (voci e timeline) e
 * le transizioni CLIENTE della state machine.
 *
 * Le azioni dipendono dallo stato ed e' il BACKEND a stabilirlo
 * (caricaEValidaStatoOwner): qui si mostrano solo quelle legali, cosi'
 * l'utente non incontra rifiuti — ma la verita' resta lato server.
 */
@Component({
  selector: 'app-ordini-cliente',
  imports: [DecimalPipe, DatePipe, MatIconModule, RouterLink],
  templateUrl: './ordini.html',
  styleUrl: './ordini.css',
})
export class OrdiniCliente {
  private ordineS = inject(Ordine);
  private platformId = inject(PLATFORM_ID);

  ordini = signal<OrdineDTO[]>([]);
  caricando = signal(true);
  apertoId = signal<number | null>(null);
  dettaglio = signal<OrdineDTO | null>(null);
  timeline = signal<StoricoStatoOrdineDTO[]>([]);
  inCorso = signal<number | null>(null);
  messaggio = signal<Toast>(null);

  readonly ETICHETTA_STATO: Record<string, string> = {
    CREATO: 'In preparazione',
    SPEDITO: 'Spedito',
    CONSEGNATO: 'Consegnato',
    NON_CONSEGNATO: 'Non consegnato',
    RESO_RICHIESTO: 'Reso richiesto',
    RIMBORSATO: 'Rimborsato',
    ANNULLATO: 'Annullato',
    CANCELLATO: 'Cancellato',
  };

  /** Azioni per stato: rispecchia gli Set.of(...) del service backend. */
  private readonly AZIONI: Record<string, Azione[]> = {
    CREATO: [
      { path: 'annulla', label: 'Annulla ordine', icona: 'cancel',
        conferma: 'Annullare l\'ordine? Il credito ti verrà restituito.',
        distruttiva: true },
    ],
    SPEDITO: [
      { path: 'conferma-consegna', label: 'Ho ricevuto', icona: 'check_circle' },
      { path: 'segnala-non-consegnato', label: 'Non è arrivato', icona: 'report_problem',
        conferma: 'Segnalare che l\'ordine non è arrivato?' },
    ],
    CONSEGNATO: [
      { path: 'richiedi-reso', label: 'Richiedi reso', icona: 'keyboard_return',
        conferma: 'Richiedere il reso di questo ordine?' },
    ],
  };

  azioniDi(o: OrdineDTO): Azione[] {
    return this.AZIONI[o.stato] ?? [];
  }

  constructor() {
    if (isPlatformBrowser(this.platformId)) this.carica();
    else this.caricando.set(false);
  }

  private carica(): void {
    this.caricando.set(true);
    this.ordineS.list().subscribe({
      next: l => { this.ordini.set(l); this.caricando.set(false); },
      error: err => {
        this.ordini.set([]); this.caricando.set(false);
        this.toast(err?.error?.msg ?? 'Impossibile caricare gli ordini', true);
      }
    });
  }

  /** La lista NON porta le voci: il dettaglio si chiede all'apertura. */
  apri(o: OrdineDTO): void {
    if (this.apertoId() === o.id) { this.apertoId.set(null); return; }
    this.apertoId.set(o.id);
    this.dettaglio.set(null);
    this.timeline.set([]);
    this.ordineS.dettaglio(o.id).subscribe({
      next: d => this.dettaglio.set(d),
      error: () => {}
    });
    this.ordineS.timeline(o.id).subscribe({
      next: t => this.timeline.set(t),
      error: () => {}
    });
  }

  esegui(o: OrdineDTO, a: Azione): void {
    if (a.conferma && !this.conferma(a.conferma)) return;
    this.inCorso.set(o.id);
    this.ordineS.transizione(o.id, a.path).subscribe({
      next: agg => {
        this.inCorso.set(null);
        // sostituzione puntuale: la lista non si ricarica, l'ordine si aggiorna
        this.ordini.update(l => l.map(x => x.id === agg.id ? agg : x));
        if (this.apertoId() === o.id) this.apri(agg);   // ricarica timeline
        this.toast(`Ordine #${o.id}: ${this.ETICHETTA_STATO[agg.stato] ?? agg.stato}.`, false);
      },
      error: err => {
        this.inCorso.set(null);
        this.toast(err?.error?.msg ?? 'Operazione non riuscita', true);
      }
    });
  }

  private conferma(msg: string): boolean {
    return isPlatformBrowser(this.platformId) ? window.confirm(msg) : false;
  }

  private toast(testo: string, errore: boolean): void {
    this.messaggio.set({ testo, errore });
    if (isPlatformBrowser(this.platformId))
      setTimeout(() => this.messaggio.set(null), 3000);
  }
  
}