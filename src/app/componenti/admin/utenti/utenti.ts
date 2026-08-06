import { Component, ElementRef, inject, signal, viewChild, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DatePipe } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../../environments/environment';
import { PaginaUtentiDTO, StoricoStatoUtenteDTO, UtenteAdminDTO } from '../../../modelli/utente-admin-dto';

const BASE = environment.apiUrl;

type Toast = { testo: string; errore: boolean } | null;

/** Il provvedimento in attesa di conferma nel dialog (null = chiuso). */
type Provvedimento = {
  tipo: 'disattiva' | 'banna' | 'riattiva';
  utente: UtenteAdminDTO;
  titolo: string;
  etichetta: string;
  distruttiva: boolean;
  motivoRichiesto: boolean;
} | null;

interface ResetPasswordDTO { msg: string; token: string | null; }

/**
 * Gestione utenti lato ADMIN (rotta /admin/utenti) — V18.
 *
 * La pagina e' la faccia del ledger storico_stato_utente: lista
 * paginata con filtri (stato + testo libero), provvedimenti col
 * MOTIVO OBBLIGATORIO (finisce nel ledger, firmato dall'admin del
 * token) e timeline espandibile per utente.
 *
 * Le azioni seguono lo STATO, non viceversa:
 *   ATTIVO      -> Disattiva / Banna / Reset password
 *   DISATTIVATO -> Riattiva / Banna
 *   BANNATO     -> niente: e' terminale, lo dice la state machine
 * Le guardie vere (mai su se stessi, mai su un altro ADMIN) vivono
 * nel backend: qui i bottoni si nascondono per gli ADMIN solo per
 * non proporre azioni destinate al 400.
 *
 * Reset password: l'admin INNESCA il flusso email della V17, non
 * sceglie mai la password di nessuno. In dev il token arriva nella
 * risposta: il link pronto finisce in console per simulare l'email.
 */
@Component({
  selector: 'app-utenti-admin',
  imports: [DatePipe, FormsModule, MatIconModule, MatTooltipModule],
  templateUrl: './utenti.html',
  styleUrl: './utenti.css',
})
export class UtentiAdmin {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  private dialogProvvedimento = viewChild.required<ElementRef<HTMLDialogElement>>('dialogProvvedimento');

  private static readonly DIMENSIONE = 20;

  stati = [
    { v: null as string | null, l: 'Tutti' },
    { v: 'ATTIVO',      l: 'Attivi' },
    { v: 'DISATTIVATO', l: 'Disattivati' },
    { v: 'BANNATO',     l: 'Bannati' },
  ];

  statoSel = signal<string | null>(null);
  q = '';                                   // legato all'input, letto al carica()
  private timerRicerca: ReturnType<typeof setTimeout> | null = null;

  dati = signal<PaginaUtentiDTO | null>(null);
  pagina = signal(0);
  caricando = signal(false);
  inCorso = signal<number | null>(null);    // id dell'utente con azione in volo
  messaggio = signal<Toast>(null);

  // Dialog provvedimento
  provvedimento = signal<Provvedimento>(null);
  motivo = '';

  // Timeline espandibile (una alla volta)
  espansoId = signal<number | null>(null);
  storico = signal<StoricoStatoUtenteDTO[]>([]);
  caricandoStorico = signal(false);

  constructor() {
    if (isPlatformBrowser(this.platformId)) this.carica();
  }

  // ------------------------------------------------------------------
  // Lista, filtri, paginazione
  // ------------------------------------------------------------------

  cambiaStato(v: string | null): void {
    if (this.statoSel() === v) return;
    this.statoSel.set(v);
    this.pagina.set(0);
    this.carica();
  }

  /** Debounce manuale sull'input: zoneless-safe, il refresh della UI
   *  lo scatena il signal quando i dati arrivano. */
  onRicerca(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.timerRicerca) clearTimeout(this.timerRicerca);
    this.timerRicerca = setTimeout(() => {
      this.pagina.set(0);
      this.carica();
    }, 350);
  }

  totalePagine(): number {
    const d = this.dati();
    return d ? Math.max(1, Math.ceil(d.totale / UtentiAdmin.DIMENSIONE)) : 1;
  }

  precedente(): void {
    if (this.pagina() === 0) return;
    this.pagina.update(p => p - 1);
    this.carica();
  }

  successiva(): void {
    if (this.pagina() + 1 >= this.totalePagine()) return;
    this.pagina.update(p => p + 1);
    this.carica();
  }

  private carica(): void {
    this.caricando.set(true);
    this.espansoId.set(null);                     // pagina nuova, timeline chiusa

    const params: Record<string, string> = {
      pagina: String(this.pagina()),
      dimensione: String(UtentiAdmin.DIMENSIONE),
    };
    if (this.statoSel()) params['stato'] = this.statoSel()!;
    if (this.q.trim())   params['q'] = this.q.trim();

    this.http.get<PaginaUtentiDTO>(`${BASE}/admin/utenti`, { params })
      .subscribe({
        next: d => { this.dati.set(d); this.caricando.set(false); },
        error: err => {
          this.dati.set(null); this.caricando.set(false);
          this.toast(err?.error?.msg ?? 'Errore nel caricamento', true);
        }
      });
  }

  // ------------------------------------------------------------------
  // Provvedimenti: dialog col motivo, poi POST
  // ------------------------------------------------------------------

  apriDisattiva(u: UtenteAdminDTO): void {
    this.apri({ tipo: 'disattiva', utente: u, distruttiva: false, motivoRichiesto: true,
      titolo: `Disattivare ${u.username}?`,
      etichetta: 'Disattiva' });
  }

  apriBanna(u: UtenteAdminDTO): void {
    this.apri({ tipo: 'banna', utente: u, distruttiva: true, motivoRichiesto: true,
      titolo: `Bannare ${u.username}?`,
      etichetta: 'Banna definitivamente' });
  }

  apriRiattiva(u: UtenteAdminDTO): void {
    this.apri({ tipo: 'riattiva', utente: u, distruttiva: false, motivoRichiesto: false,
      titolo: `Riattivare ${u.username}?`,
      etichetta: 'Riattiva' });
  }

  private apri(p: NonNullable<Provvedimento>): void {
    this.motivo = '';
    this.provvedimento.set(p);
    this.dialogProvvedimento().nativeElement.showModal();
  }

  chiudiProvvedimento(): void {
    this.dialogProvvedimento().nativeElement.close();
  }

  get motivoMancante(): boolean {
    const p = this.provvedimento();
    return !!p && p.motivoRichiesto && !this.motivo.trim();
  }

  confermaProvvedimento(): void {
    const p = this.provvedimento();
    if (!p || this.motivoMancante) return;
    this.chiudiProvvedimento();
    this.inCorso.set(p.utente.id);

    // banna/disattiva: motivo nel body (obbligatorio, va nel ledger).
    // riattiva: body vuoto, eventuale motivo come query param.
    const url = `${BASE}/admin/utenti/${p.utente.id}/${p.tipo}`;
    const richiesta = p.tipo === 'riattiva'
      ? this.http.post<UtenteAdminDTO>(url, null,
          this.motivo.trim() ? { params: { motivo: this.motivo.trim() } } : {})
      : this.http.post<UtenteAdminDTO>(url, { motivo: this.motivo.trim() });

    richiesta.subscribe({
      next: u => {
        this.inCorso.set(null);
        this.toast(`${u.username}: ora ${u.stato}.`, false);
        this.carica();
      },
      error: err => {
        this.inCorso.set(null);
        this.toast(err?.error?.msg ?? 'Operazione non riuscita', true);
      }
    });
  }

  // ------------------------------------------------------------------
  // Reset password innescato (l'admin non sceglie mai la password)
  // ------------------------------------------------------------------

  resetPassword(u: UtenteAdminDTO): void {
    if (this.inCorso() !== null) return;
    this.inCorso.set(u.id);

    this.http.post<ResetPasswordDTO>(`${BASE}/admin/utenti/${u.id}/reset-password`, null)
      .subscribe({
        next: r => {
          this.inCorso.set(null);
          if (r.token) {
            // Sviluppo: link pronto in console, come fosse l'email
            console.info(`[dev] Link reset per ${u.username}: /reimposta-password?token=${r.token}`);
            this.toast(`${r.msg} — link (dev) in console.`, false);
          } else {
            this.toast(r.msg, false);
          }
        },
        error: err => {
          this.inCorso.set(null);
          this.toast(err?.error?.msg ?? 'Operazione non riuscita', true);
        }
      });
  }

  // ------------------------------------------------------------------
  // Timeline del ledger
  // ------------------------------------------------------------------

  toggleStorico(u: UtenteAdminDTO): void {
    if (this.espansoId() === u.id) { this.espansoId.set(null); return; }
    this.espansoId.set(u.id);
    this.storico.set([]);
    this.caricandoStorico.set(true);

    this.http.get<StoricoStatoUtenteDTO[]>(`${BASE}/admin/utenti/${u.id}/storico-stato`)
      .subscribe({
        next: l => { this.storico.set(l); this.caricandoStorico.set(false); },
        error: err => {
          this.caricandoStorico.set(false);
          this.toast(err?.error?.msg ?? 'Storico non disponibile', true);
        }
      });
  }

  /** "chi ha agito": l'utente stesso o l'admin firmatario. */
  esecutore(r: StoricoStatoUtenteDTO, utenteId: number): string {
    return r.eseguitoDaId === utenteId ? "l'utente stesso" : r.eseguitoDaUsername;
  }

  // ------------------------------------------------------------------

  private toast(testo: string, errore: boolean): void {
    this.messaggio.set({ testo, errore });
    if (isPlatformBrowser(this.platformId))
      setTimeout(() => this.messaggio.set(null), 2800);
  }
}