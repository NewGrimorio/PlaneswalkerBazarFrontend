import { Component, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DecimalPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../../environments/environment';
import { OrdineDTO } from '../../../modelli/ordine-dto';

const BASE = environment.apiUrl;

type Toast = { testo: string; errore: boolean } | null;

/**
 * Coda ordini lato ADMIN, dentro AdminLayout (rotta /admin/ordini).
 * Si sceglie uno stato (una "coda di lavoro") e si agisce: le azioni
 * disponibili dipendono dallo stato, e dopo ogni azione l'ordine esce
 * dalla coda corrente (si ricarica la lista).
 *
 * Backend: AdminOrdineController. La lista NON porta le voci (solo lo
 * snapshot indirizzo + totale); il dettaglio delle righe richiederebbe
 * un endpoint admin dedicato, per ora fuori scope. http diretto come
 * gli altri componenti admin (magazzino, prodotti).
 */
@Component({
  selector: 'app-ordini',
  imports: [DecimalPipe, DatePipe, MatIconModule],
  templateUrl: './ordini.html',
  styleUrl: './ordini.css',
})
export class Ordini {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  stati = [
    { v: 'CREATO',         l: 'Da spedire' },
    { v: 'SPEDITO',        l: 'Spedite' },
    { v: 'CONSEGNATO',     l: 'Consegnate' },
    { v: 'RESO_RICHIESTO', l: 'Resi da rimborsare' },
    { v: 'NON_CONSEGNATO', l: 'Non consegnate' },
    { v: 'RIMBORSATO',     l: 'Rimborsate' },
  ];

  statoSel = signal<string>('CREATO');
  ordini = signal<OrdineDTO[]>([]);
  caricando = signal(false);
  inCorso = signal<number | null>(null);   // id dell'ordine in azione
  messaggio = signal<Toast>(null);

  constructor() {
    if (isPlatformBrowser(this.platformId)) this.carica();
  }

  cambiaStato(v: string): void {
    if (this.statoSel() === v) return;
    this.statoSel.set(v);
    this.carica();
  }

  private carica(): void {
    this.caricando.set(true);
    this.http.get<OrdineDTO[]>(`${BASE}/admin/ordini`, { params: { stato: this.statoSel() } })
      .subscribe({
        next: l => { this.ordini.set(l); this.caricando.set(false); },
        error: err => {
          this.ordini.set([]); this.caricando.set(false);
          this.toast(err?.error?.msg ?? 'Errore nel caricamento', true);
        }
      });
  }

  // --- Azioni (le disponibili dipendono dallo stato) ---

  spedisci(o: OrdineDTO): void {
    this.azione(o, 'spedisci', `Ordine #${o.id} segnato come spedito.`);
  }

  cancella(o: OrdineDTO): void {
    if (!this.conferma(`Cancellare l'ordine #${o.id}? Scorte e credito verranno ripristinati.`)) return;
    this.azione(o, 'cancella', `Ordine #${o.id} cancellato: scorte e credito ripristinati.`);
  }

  rimborsa(o: OrdineDTO): void {
    if (!this.conferma(`Rimborsare l'ordine #${o.id}? Il credito tornerà al cliente.`)) return;
    this.azione(o, 'rimborsa', `Ordine #${o.id} rimborsato.`);
  }

  private azione(o: OrdineDTO, path: string, successo: string): void {
    this.inCorso.set(o.id);
    this.http.post<OrdineDTO>(`${BASE}/admin/ordini/${o.id}/${path}`, {})
      .subscribe({
        next: () => { this.inCorso.set(null); this.toast(successo, false); this.carica(); },
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
      setTimeout(() => this.messaggio.set(null), 2800);
  }
}