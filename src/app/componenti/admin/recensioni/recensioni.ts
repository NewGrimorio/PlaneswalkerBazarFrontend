import { Component, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../../environments/environment';
import { RecensioneDTO } from '../../../modelli/recensione-dto';

const BASE = environment.apiUrl;

type Toast = { testo: string; errore: boolean } | null;

/**
 * Moderazione recensioni lato ADMIN (rotta /admin/recensioni).
 * Policy V15: MODERAZIONE PREVENTIVA — le nuove nascono IN_ATTESA e
 * diventano pubbliche solo con l'approvazione. Anche la MODIFICA di
 * una recensione pubblicata la riporta in questa coda.
 *
 * Tre code, tre intenti:
 *   IN_ATTESA  -> "Da moderare": approva (pubblica) o rifiuta
 *   APPROVATA  -> "Pubblicate":  si puo' nascondere a posteriori
 *   RIFIUTATA  -> "Nascoste":    si puo' ripristinare
 *
 * modera(true) = APPROVATA;  modera(false) = RIFIUTATA — le quattro
 * azioni sono due chiamate con etichette diverse per contesto.
 */
@Component({
  selector: 'app-recensioni',
  imports: [DatePipe, MatIconModule],
  templateUrl: './recensioni.html',
  styleUrl: './recensioni.css',
})
export class Recensioni {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  stati = [
    { v: 'IN_ATTESA', l: 'Da moderare' },
    { v: 'APPROVATA', l: 'Pubblicate' },
    { v: 'RIFIUTATA', l: 'Nascoste' },
  ];

  statoSel = signal<string>('IN_ATTESA');
  recensioni = signal<RecensioneDTO[]>([]);
  caricando = signal(false);
  inCorso = signal<number | null>(null);
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
    this.http.get<RecensioneDTO[]>(`${BASE}/admin/recensioni`, { params: { stato: this.statoSel() } })
      .subscribe({
        next: l => { this.recensioni.set(l); this.caricando.set(false); },
        error: err => {
          this.recensioni.set([]); this.caricando.set(false);
          this.toast(err?.error?.msg ?? 'Errore nel caricamento', true);
        }
      });
  }

  /** Array [1..5] per disegnare le stelle piene/vuote nel template. */
  stelle(voto: number): boolean[] {
    return [1, 2, 3, 4, 5].map(n => n <= voto);
  }

  // --- Coda IN_ATTESA: il gate della pubblicazione ---
  approva(r: RecensioneDTO): void { this.modera(r, true, `Recensione #${r.id} pubblicata.`); }
  rifiuta(r: RecensioneDTO): void { this.modera(r, false, `Recensione #${r.id} rifiutata.`); }

  // --- Interventi a posteriori sulle altre code ---
  nascondi(r: RecensioneDTO): void { this.modera(r, false, `Recensione #${r.id} nascosta.`); }
  ripristina(r: RecensioneDTO): void { this.modera(r, true, `Recensione #${r.id} ripristinata.`); }

  private modera(r: RecensioneDTO, approvata: boolean, successo: string): void {
    this.inCorso.set(r.id);
    this.http.post<RecensioneDTO>(`${BASE}/admin/recensioni/${r.id}/modera`, null,
        { params: { approvata } })
      .subscribe({
        next: () => { this.inCorso.set(null); this.toast(successo, false); this.carica(); },
        error: err => {
          this.inCorso.set(null);
          this.toast(err?.error?.msg ?? 'Operazione non riuscita', true);
        }
      });
  }

  private toast(testo: string, errore: boolean): void {
    this.messaggio.set({ testo, errore });
    if (isPlatformBrowser(this.platformId))
      setTimeout(() => this.messaggio.set(null), 2800);
  }
}