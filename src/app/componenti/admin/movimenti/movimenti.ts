import { Component, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DecimalPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../../environments/environment';
import { MovimentoDTO } from '../../../modelli/movimento-dto';

const BASE = environment.apiUrl;

type Toast = { testo: string; errore: boolean } | null;

/**
 * Sportello bonifici lato ADMIN (rotta /admin/movimenti). Coda dei
 * movimenti IN_ATTESA: bonifici in ENTRATA da confermare (RICARICA) e
 * prelievi da ESEGUIRE (PRELIEVO). Approva o rifiuta; dopo l'azione il
 * movimento esce dalla coda (si ricarica).
 *
 * Attenzione al significato del rifiuto, diverso per tipo (lo dice il
 * backend): ricarica rifiutata = nessun accredito; prelievo rifiutato
 * = ri-accredito di quanto era stato decurtato alla richiesta.
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

  movimenti = signal<MovimentoDTO[]>([]);
  caricando = signal(false);
  inCorso = signal<number | null>(null);
  messaggio = signal<Toast>(null);

  constructor() {
    if (isPlatformBrowser(this.platformId)) this.carica();
  }

  private carica(): void {
    this.caricando.set(true);
    this.http.get<MovimentoDTO[]>(`${BASE}/admin/movimenti/in-attesa`).subscribe({
      next: l => { this.movimenti.set(l); this.caricando.set(false); },
      error: err => {
        this.movimenti.set([]); this.caricando.set(false);
        this.toast(err?.error?.msg ?? 'Errore nel caricamento', true);
      }
    });
  }

  /** Etichetta leggibile del tipo movimento in coda. */
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
        next: () => { this.inCorso.set(null); this.toast(successo, false); this.carica(); },
        error: err => {
          this.inCorso.set(null);
          this.toast(err?.error?.msg ?? 'Operazione non riuscita', true);
        }
      });
  }

  private chiedi(msg: string): boolean {
    return isPlatformBrowser(this.platformId) ? window.confirm(msg) : false;
  }

  private toast(testo: string, errore: boolean): void {
    this.messaggio.set({ testo, errore });
    if (isPlatformBrowser(this.platformId))
      setTimeout(() => this.messaggio.set(null), 2800);
  }
}