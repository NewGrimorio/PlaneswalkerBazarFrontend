import { Component, ElementRef, computed, inject, signal, viewChild, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DecimalPipe, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Portafoglio } from '../../../services/portafoglio';
import { Conto } from '../../../services/conto';
import { PortafoglioDTO } from '../../../modelli/portafoglio-dto';
import { MovimentoDTO } from '../../../modelli/movimento-dto';
import { ContoBancarioDTO } from '../../../modelli/conto-bancario-dto';

type Toast = { testo: string; errore: boolean } | null;

/** Commissione PayPal: SPECULARE alle costanti di PortafoglioImpl.
 *  Serve solo all'ANTEPRIMA — il calcolo che vale e' quello del server. */
const PAYPAL_PERCENTUALE = 0.05;
const PAYPAL_FISSO = 0.35;

/**
 * "Il mio credito": saldo, ricarica, ritiro e storico movimenti.
 *
 * Le tre operazioni si comportano in modo DIVERSO, e la pagina lo
 * dice apertamente invece di far sembrare un bug l'attesa:
 *  - PayPal   -> accredito immediato del netto
 *  - Bonifico -> in attesa della conferma admin, saldo fermo
 *  - Prelievo -> saldo decurtato SUBITO, bonifico eseguito dall'admin
 *
 * L'anteprima della commissione e' dichiarata come stima: la verita'
 * la calcola il backend (stesso principio delle spese di spedizione).
 */
@Component({
  selector: 'app-portafoglio-cliente',
  imports: [DecimalPipe, DatePipe, MatIconModule, RouterLink],
  templateUrl: './portafoglio.html',
  styleUrl: './portafoglio.css',
})
export class PortafoglioCliente {
  private portafoglioS = inject(Portafoglio);
  private contoS = inject(Conto);
  private platformId = inject(PLATFORM_ID);

  private dialogPrelievo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogPrelievo');

  portafoglio = signal<PortafoglioDTO | null>(null);
  movimenti = signal<MovimentoDTO[]>([]);
  conti = signal<ContoBancarioDTO[]>([]);
  caricando = signal(true);
  inCorso = signal(false);
  messaggio = signal<Toast>(null);

  saldo = computed(() => this.portafoglio()?.saldo ?? 0);

  // --- Ricarica ---
  importoRicarica = signal('');
  metodoRicarica = signal<'PAYPAL' | 'BONIFICO'>('PAYPAL');

  importoRicaricaNum = computed(() => this.parse(this.importoRicarica()));

  /** ANTEPRIMA: il server ricalcola sempre (mai fidarsi del client sui soldi). */
  commissioneStimata = computed(() => {
    if (this.metodoRicarica() !== 'PAYPAL') return 0;
    const c = this.importoRicaricaNum() * PAYPAL_PERCENTUALE + PAYPAL_FISSO;
    return Math.round(c * 100) / 100;
  });
  nettoStimato = computed(() =>
      Math.max(0, this.importoRicaricaNum() - this.commissioneStimata()));

  ricaricaValida = computed(() =>
      this.importoRicaricaNum() > 0 && this.nettoStimato() > 0);

  // --- Prelievo ---
  importoPrelievo = signal('');
  contoSel = signal<number | null>(null);
  erroreDialog = signal<string | null>(null);

  importoPrelievoNum = computed(() => this.parse(this.importoPrelievo()));
  prelievoValido = computed(() =>
      this.importoPrelievoNum() > 0
      && this.importoPrelievoNum() <= this.saldo()
      && this.contoSel() !== null);

  constructor() {
    if (isPlatformBrowser(this.platformId)) this.caricaTutto();
    else this.caricando.set(false);
  }

  private caricaTutto(): void {
    this.caricando.set(true);
    this.portafoglioS.get().subscribe({
      next: p => { this.portafoglio.set(p); this.caricando.set(false); },
      error: err => {
        this.caricando.set(false);
        this.toast(err?.error?.msg ?? 'Impossibile caricare il credito', true);
      }
    });
    this.caricaMovimenti();
    this.contoS.list().subscribe({
      next: c => {
        this.conti.set(c);
        // Un solo conto: gia' scelto, un click in meno
        if (c.length === 1) this.contoSel.set(c[0].id);
      },
      error: () => {}
    });
  }

  private caricaMovimenti(): void {
    this.portafoglioS.storico().subscribe({
      next: m => this.movimenti.set(m),
      error: () => {}
    });
  }

  // ------------------------------------------------------------------
  // Ricarica
  // ------------------------------------------------------------------

  aggiornaImportoRicarica(e: Event): void {
    this.importoRicarica.set((e.target as HTMLInputElement).value);
  }

  scegliMetodo(m: 'PAYPAL' | 'BONIFICO'): void {
    this.metodoRicarica.set(m);
  }

  ricarica(): void {
    if (!this.ricaricaValida() || this.inCorso()) return;
    this.inCorso.set(true);
    const metodo = this.metodoRicarica();
    this.portafoglioS.ricarica(this.importoRicaricaNum(), metodo).subscribe({
      next: () => {
        this.inCorso.set(false);
        this.importoRicarica.set('');
        this.aggiorna();
        this.toast(metodo === 'PAYPAL'
            ? 'Ricarica completata: il credito è già disponibile.'
            : 'Richiesta registrata: il credito arriverà dopo la verifica del bonifico.',
            false);
      },
      error: err => {
        this.inCorso.set(false);
        this.toast(err?.error?.msg ?? 'Ricarica non riuscita', true);
      }
    });
  }

  // ------------------------------------------------------------------
  // Prelievo (dialog di conferma: qui si muovono soldi)
  // ------------------------------------------------------------------

  aggiornaImportoPrelievo(e: Event): void {
    this.importoPrelievo.set((e.target as HTMLInputElement).value);
  }

  tuttoIlSaldo(): void {
    this.importoPrelievo.set(this.saldo().toFixed(2));
  }

  apriPrelievo(): void {
    if (!this.prelievoValido()) return;
    this.erroreDialog.set(null);
    this.dialogPrelievo().nativeElement.showModal();
  }

  chiudiPrelievo(): void {
    this.dialogPrelievo().nativeElement.close();
  }

  contoScelto(): ContoBancarioDTO | undefined {
    return this.conti().find(c => c.id === this.contoSel());
  }

  confermaPrelievo(): void {
    if (!this.prelievoValido() || this.inCorso()) return;
    this.inCorso.set(true);
    this.erroreDialog.set(null);
    this.portafoglioS.preleva(this.importoPrelievoNum(), this.contoSel()!).subscribe({
      next: () => {
        this.inCorso.set(false);
        this.chiudiPrelievo();
        this.importoPrelievo.set('');
        this.aggiorna();
        this.toast('Richiesta inviata: il bonifico verrà eseguito dopo la verifica.', false);
      },
      error: err => {
        this.inCorso.set(false);
        // il dialog RESTA aperto col messaggio: niente dato perso
        this.erroreDialog.set(err?.error?.msg ?? 'Operazione non riuscita');
      }
    });
  }

  // ------------------------------------------------------------------
  // Storico
  // ------------------------------------------------------------------

  /** Segno del movimento: il tipo decide, l'importo e' sempre positivo. */
  isEntrata(m: MovimentoDTO): boolean {
    return m.tipo === 'RICARICA' || m.tipo === 'RIMBORSO';
  }

  readonly ETICHETTA_TIPO: Record<string, string> = {
    RICARICA: 'Ricarica',
    PRELIEVO: 'Ritiro credito',
    PAGAMENTO_ORDINE: 'Pagamento ordine',
    RIMBORSO: 'Rimborso',
    RETTIFICA: 'Rettifica',
  };

  readonly ETICHETTA_STATO: Record<string, string> = {
    IN_ATTESA: 'In verifica',
    COMPLETATO: 'Completato',
    RIFIUTATO: 'Rifiutato',
  };

  private aggiorna(): void {
    this.portafoglioS.get().subscribe({ next: p => this.portafoglio.set(p), error: () => {} });
    this.caricaMovimenti();
  }

  /** Virgola o punto: l'utente scrive come gli viene. */
  private parse(v: string): number {
    const n = Number(v.replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  private toast(testo: string, errore: boolean): void {
    this.messaggio.set({ testo, errore });
    if (isPlatformBrowser(this.platformId))
      setTimeout(() => this.messaggio.set(null), 3600);
  }
}