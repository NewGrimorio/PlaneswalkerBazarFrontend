import { Component, computed, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Carrello } from '../../../services/carrello';
import { Portafoglio } from '../../../services/portafoglio';
import { Indirizzo } from '../../../services/indirizzo';
import { Ordine } from '../../../services/ordine';
import { CarrelloDTO } from '../../../modelli/carrello-dto';
import { urlImmagine } from '../../../utils/url-immagine';
import { PortafoglioDTO } from '../../../modelli/portafoglio-dto';
import { IndirizzoDTO } from '../../../modelli/indirizzo-dto';
import { OrdineDTO } from '../../../modelli/ordine-dto';


type Toast = { testo: string; errore: boolean } | null;

/**
 * Checkout MINIMO (temporaneo). Autosufficiente perche' un cliente
 * oggi non ha altre pagine per credito e indirizzi (l'account vive
 * sotto /admin). Quindi qui dentro: riepilogo carrello, ricarica
 * credito (PAYPAL = immediata), scelta/creazione indirizzo, scelta
 * della spedizione, conferma.
 *
 * Tutto richiede il token: si carica solo nel browser. In SSR la
 * pagina resta un guscio (il guard si astiene, il client completa).
 */
@Component({
  selector: 'app-checkout',
  imports: [FormsModule, RouterLink, DecimalPipe, MatIconModule],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class Checkout {
  private carrelloS = inject(Carrello);
  private portafoglioS = inject(Portafoglio);
  private indirizzoS = inject(Indirizzo);
  private ordineS = inject(Ordine);
  private platformId = inject(PLATFORM_ID);

  protected readonly urlImmagine = urlImmagine;

  carrello = signal<CarrelloDTO | null>(null);
  portafoglio = signal<PortafoglioDTO | null>(null);
  indirizzi = signal<IndirizzoDTO[]>([]);
  indirizzoSel = signal<number | null>(null);

  ordineCreato = signal<OrdineDTO | null>(null);
  messaggio = signal<Toast>(null);
  inCorso = signal(false);
  tipoSpedizione = signal<string>('STANDARD');

  // --- Ricarica ---
  importoRicarica: number | null = null;
  metodoRicarica = 'PAYPAL';

  // --- Nuovo indirizzo ---
  mostraFormIndirizzo = signal(false);
  iDestinatario = ''; iVia = ''; iCivico = '';
  iCap = ''; iCitta = ''; iProvincia = ''; iNazione = 'IT';

  // ---------------- Spedizione ----------------
  // Costi e regola della soglia arrivano gia' calcolati dal backend:
  // qui si legge e basta, cosi' l'anteprima non puo' divergere
  // dall'addebito.

  opzioni = computed(() => this.carrello()?.opzioniSpedizione ?? []);
  spedizioneOfferta = computed(() => this.carrello()?.spedizioneOfferta ?? false);
  mancaPerGratuita = computed(() => this.carrello()?.mancaPerSpedizioneGratuita ?? 0);

  /** Opzione scelta; se non c'e' (sopra soglia resta solo express)
   *  ripiega sulla prima disponibile. */
  opzioneSel = computed(() =>
    this.opzioni().find(o => o.tipo === this.tipoSpedizione())
    ?? this.opzioni()[0] ?? null);

  // ---------------- Totali ----------------

  merce = computed(() => this.carrello()?.totale ?? 0);
  speseSpedizione = computed(() => this.opzioneSel()?.costo ?? 0);
  totale = computed(() => this.merce() + this.speseSpedizione());

  saldo = computed(() => this.portafoglio()?.saldo ?? 0);
  mancante = computed(() => Math.max(0, this.totale() - this.saldo()));
  creditoSufficiente = computed(() => this.saldo() >= this.totale());
  carrelloVuoto = computed(() => (this.carrello()?.numeroArticoli ?? 0) === 0);

  /** Stepper quantita': stessa semantica del mini-carrello — il meno
   *  si ferma a 1 (per togliere c'e' la X), il tetto sulla giacenza
   *  lo impone il backend. La risposta alimenta il signal locale e
   *  TUTTI i computed a valle si ricalcolano: merce, spedizione
   *  (soglia gratuita' compresa), totale, credito sufficiente. */
  cambiaQuantita(skuId: number, nuova: number): void {
    if (nuova < 1) return;
    this.carrelloS.updateVoce(skuId, nuova).subscribe({
      next: c => this.carrello.set(c),
      error: err => this.toast(err?.error?.msg ?? 'Quantità non disponibile', true),
    });
  }

  /** Rimozione dal riepilogo: la risposta e' il carrello aggiornato —
   *  alimenta il signal locale (totali e spedizione si ricalcolano da
   *  soli) e, via tap del service, anche il badge in topbar. */
  rimuoviVoce(voceId: number): void {
    this.carrelloS.removeVoce(voceId).subscribe({
      next: c => this.carrello.set(c),
      error: err => this.toast(err?.error?.msg ?? 'Impossibile rimuovere', true),
    });
  }

  puoConfermare = computed(() =>
    !this.carrelloVuoto()
    && this.indirizzoSel() !== null
    && this.creditoSufficiente()
    && !this.inCorso());

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.caricaCarrello();
      this.caricaPortafoglio();
      this.caricaIndirizzi();
    }
  }

  // ---------------- Caricamenti ----------------

  private caricaCarrello(): void {
    this.carrelloS.get().subscribe({ next: c => this.carrello.set(c), error: () => {} });
  }
  private caricaPortafoglio(): void {
    this.portafoglioS.get().subscribe({ next: p => this.portafoglio.set(p), error: () => {} });
  }
  private caricaIndirizzi(): void {
    this.indirizzoS.list().subscribe({
      next: l => {
        this.indirizzi.set(l);
        // preseleziona il predefinito, o il primo
        const pref = l.find(i => i.predefinito) ?? l[0];
        if (pref && this.indirizzoSel() === null) this.indirizzoSel.set(pref.id);
        this.mostraFormIndirizzo.set(l.length === 0);   // nessun indirizzo -> form aperto
      },
      error: () => {}
    });
  }

  // ---------------- Spedizione ----------------

  scegliSpedizione(tipo: string): void { this.tipoSpedizione.set(tipo); }

  // ---------------- Ricarica ----------------

  /**
   * Specchio ESATTO del calcolo backend (PortafoglioImpl:
   * PAYPAL_PERCENTUALE 0.05, PAYPAL_FISSO 0.35, HALF_UP a 2 decimali):
   * la commissione e' TRATTENUTA dall'importo pagato, quindi cio' che
   * arriva sul saldo e' il netto. Questi metodi alimentano la riga
   * informativa live sotto il form — se il backend cambiasse tariffa,
   * vanno aggiornati insieme (unica fonte di verita': il server).
   */
  commissionePaypal(): number | null {
    const imp = this.importoRicarica;
    if (imp == null || imp <= 0) return null;
    return Math.round((imp * 0.05 + 0.35) * 100) / 100;
  }

  nettoPaypal(): number | null {
    const imp = this.importoRicarica;
    const c = this.commissionePaypal();
    if (imp == null || c == null) return null;
    return Math.round((imp - c) * 100) / 100;
  }

  /** Precompila l'importo lordo che, al netto della commissione PayPal
   *  (5% + 0,35), copre esattamente il mancante. Per il bonifico e' il
   *  mancante secco (nessuna commissione), ma il bonifico non e'
   *  immediato: lo si segnala nel template. */
  coproIlMancante(): void {
    const m = this.mancante();
    if (m <= 0) { this.importoRicarica = null; return; }
    this.importoRicarica = this.metodoRicarica === 'PAYPAL'
      ? Math.ceil(((m + 0.35) / 0.95) * 100) / 100
      : Math.ceil(m * 100) / 100;
  }

  ricarica(): void {
    const importo = this.importoRicarica;
    if (!importo || importo <= 0 || this.inCorso()) return;
    this.inCorso.set(true);
    this.messaggio.set(null);

    this.portafoglioS.ricarica(importo, this.metodoRicarica).subscribe({
      next: esito => {
        this.inCorso.set(false);
        this.importoRicarica = null;
        if (this.metodoRicarica === 'PAYPAL') {
          this.caricaPortafoglio();   // accredito immediato: il saldo si aggiorna
          this.toast('Credito ricaricato.', false);
        } else {
          this.toast('Bonifico registrato: sara\' disponibile dopo la conferma.', false);
        }
      },
      error: err => {
        this.inCorso.set(false);
        this.toast(err?.error?.msg ?? 'Ricarica non riuscita', true);
      }
    });
  }

  // ---------------- Indirizzo ----------------

  scegliIndirizzo(id: number): void { this.indirizzoSel.set(id); }

  apriFormIndirizzo(): void { this.mostraFormIndirizzo.set(true); }

  salvaIndirizzo(): void {
    if (this.inCorso()) return;
    if (!this.iDestinatario.trim() || !this.iVia.trim() || !this.iCivico.trim()
        || !this.iCap.trim() || !this.iCitta.trim()) {
      this.toast('Compila destinatario, via, civico, CAP e città.', true);
      return;
    }
    this.inCorso.set(true);
    const corpo = {
      destinatario: this.iDestinatario.trim(),
      via: this.iVia.trim(),
      civico: this.iCivico.trim(),
      cap: this.iCap.trim(),
      citta: this.iCitta.trim(),
      provincia: this.iProvincia.trim() || null,
      nazione: this.iNazione.trim().toUpperCase() || null,
    };
    this.indirizzoS.create(corpo).subscribe({
      next: nuovo => {
        this.inCorso.set(false);
        this.mostraFormIndirizzo.set(false);
        this.iDestinatario = this.iVia = this.iCivico = '';
        this.iCap = this.iCitta = this.iProvincia = '';
        this.iNazione = 'IT';
        this.caricaIndirizzi();
        this.indirizzoSel.set(nuovo.id);   // seleziona quello appena creato
        this.toast('Indirizzo salvato.', false);
      },
      error: err => {
        this.inCorso.set(false);
        this.toast(err?.error?.msg ?? 'Salvataggio non riuscito', true);
      }
    });
  }

  // ---------------- Conferma ----------------

  conferma(): void {
    const indId = this.indirizzoSel();
    if (indId === null || !this.puoConfermare()) return;
    this.inCorso.set(true);
    this.messaggio.set(null);

    // Il metodo e' una preferenza: sopra soglia il server lo sostituisce
    // comunque con EXPRESS offerta.
    this.ordineS.checkout(indId, this.tipoSpedizione()).subscribe({
      next: ordine => {
        this.inCorso.set(false);
        this.ordineCreato.set(ordine);
        this.carrello.set(null);   // il checkout ha svuotato il carrello
      },
      error: err => {
        this.inCorso.set(false);
        this.toast(err?.error?.msg ?? 'Checkout non riuscito', true);
      }
    });
  }

  private toast(testo: string, errore: boolean): void {
    this.messaggio.set({ testo, errore });
    if (isPlatformBrowser(this.platformId))
      setTimeout(() => this.messaggio.set(null), 3000);
  }
}