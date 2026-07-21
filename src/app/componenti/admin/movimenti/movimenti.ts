import { Component, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DecimalPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../../environments/environment';
import { MovimentoDTO } from '../../../modelli/movimento-dto';

const BASE = environment.apiUrl;

type Toast = { testo: string; errore: boolean } | null;

/**
 * Movimenti admin, DUE sezioni:
 *  1) IN ATTESA — la coda da lavorare (approva/rifiuta). Bonifici in
 *     entrata (RICARICA) e prelievi da eseguire (PRELIEVO).
 *  2) STORICO globale — i movimenti CONCLUSI di TUTTI i clienti, sola
 *     lettura, con nome cliente. Filtrabile per stato e metodo. Gli
 *     IN_ATTESA restano fuori (sono nella sezione 1): niente doppioni.
 */
@Component({
  selector: 'app-movimenti',
  imports: [DecimalPipe, DatePipe, MatIconModule],
  templateUrl: './movimenti.html',
  styleUrl: './movimenti.css',
})
export class Movimenti {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  // --- Sezione 1: in attesa ---
  inAttesa = signal<MovimentoDTO[]>([]);
  caricandoAttesa = signal(false);
  inCorso = signal<number | null>(null);

  // --- Sezione 2: storico ---
  storico = signal<MovimentoDTO[]>([]);
  caricandoStorico = signal(false);
  statiStorico = [
    { v: '',           l: 'Tutti' },
    { v: 'COMPLETATO', l: 'Completati' },
    { v: 'RIFIUTATO',  l: 'Rifiutati' },
  ];
  metodiStorico = [
    { v: '',         l: 'Tutti' },
    { v: 'PAYPAL',   l: 'PayPal' },
    { v: 'BONIFICO', l: 'Bonifico' },
    { v: 'INTERNO',  l: 'Interno' },
  ];
  statoSel = signal<string>('');
  metodoSel = signal<string>('');

  messaggio = signal<Toast>(null);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.caricaAttesa();
      this.caricaStorico();
    }
  }

  // ============================================================
  // Sezione 1: in attesa
  // ============================================================

  private caricaAttesa(): void {
    this.caricandoAttesa.set(true);
    this.http.get<MovimentoDTO[]>(`${BASE}/admin/movimenti/in-attesa`).subscribe({
      next: l => { this.inAttesa.set(l); this.caricandoAttesa.set(false); },
      error: err => {
        this.inAttesa.set([]); this.caricandoAttesa.set(false);
        this.toast(err?.error?.msg ?? 'Errore nel caricamento', true);
      }
    });
  }

  etichettaTipo(m: MovimentoDTO): string {
    if (m.tipo === 'RICARICA') return 'Ricarica (bonifico in entrata)';
    if (m.tipo === 'PRELIEVO') return 'Prelievo (da eseguire)';
    return m.tipo;
  }

  approva(m: MovimentoDTO): void {
    this.conferma(m, true, `Movimento #${m.id} approvato.`);
  }

  rifiuta(m: MovimentoDTO): void {
    const msg = m.tipo === 'PRELIEVO'
      ? `Rifiutare il prelievo #${m.id}? L'importo verrà ri-accreditato al cliente.`
      : `Rifiutare la ricarica #${m.id}?`;
    if (!this.chiedi(msg)) return;
    this.conferma(m, false, `Movimento #${m.id} rifiutato.`);
  }

  private conferma(m: MovimentoDTO, approvato: boolean, successo: string): void {
    this.inCorso.set(m.id);
    this.http.post<MovimentoDTO>(`${BASE}/admin/movimenti/conferma`,
        { movimentoId: m.id, approvato })
      .subscribe({
        next: () => {
          this.inCorso.set(null); this.toast(successo, false);
          this.caricaAttesa();     // esce dalla coda
          this.caricaStorico();    // entra nello storico
        },
        error: err => {
          this.inCorso.set(null);
          this.toast(err?.error?.msg ?? 'Operazione non riuscita', true);
        }
      });
  }

  // ============================================================
  // Sezione 2: storico
  // ============================================================

  cambiaStato(v: string): void { this.statoSel.set(v); this.caricaStorico(); }
  cambiaMetodo(v: string): void { this.metodoSel.set(v); this.caricaStorico(); }

  private caricaStorico(): void {
    this.caricandoStorico.set(true);
    let params: Record<string, string> = {};
    if (this.statoSel()) params['stato'] = this.statoSel();
    if (this.metodoSel()) params['metodo'] = this.metodoSel();

    this.http.get<MovimentoDTO[]>(`${BASE}/admin/movimenti/storico`, { params }).subscribe({
      next: l => { this.storico.set(l); this.caricandoStorico.set(false); },
      error: err => {
        this.storico.set([]); this.caricandoStorico.set(false);
        this.toast(err?.error?.msg ?? 'Errore nel caricamento storico', true);
      }
    });
  }

  /** Segno del movimento: entrate positive, uscite negative (solo estetica). */
  isEntrata(m: MovimentoDTO): boolean {
    return m.tipo === 'RICARICA' || m.tipo === 'RIMBORSO';
  }

  // ============================================================

  private chiedi(msg: string): boolean {
    return isPlatformBrowser(this.platformId) ? window.confirm(msg) : false;
  }

  private toast(testo: string, errore: boolean): void {
    this.messaggio.set({ testo, errore });
    if (isPlatformBrowser(this.platformId))
      setTimeout(() => this.messaggio.set(null), 2800);
  }
}