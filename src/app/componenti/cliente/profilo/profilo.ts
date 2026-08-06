import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { AuthServices } from '../../../auth/auth-services';
import { Utente } from '../../../services/utente';
import { Portafoglio } from '../../../services/portafoglio';
import { Carrello } from '../../../services/carrello';
import { UtenteDTO } from '../../../modelli/utente-dto';
import { urlImmagine } from '../../../utils/url-immagine';

type Esito = { testo: string; errore: boolean } | null;

/**
 * Profilo CLIENTE (/account/profilo): identita' e credenziali —
 * avatar, anagrafica, email, password. Gli INDIRIZZI non stanno qui:
 * hanno la loro tessera dedicata nell'hub (/account/indirizzi), una
 * cosa sola per pagina.
 *
 * GEMELLO CONSAPEVOLE di admin/account (scelta documentata): stessa
 * logica, due componenti separati perche' le due pagine hanno ragioni
 * di cambiamento diverse (negozio vs plancia). Se tocchi un flusso
 * qui — password, email, avatar — valuta se va toccato anche la'.
 *
 * FASE C: l'account non conosce piu' il proprio id. "Chi sono" lo
 * dice il token a ogni chiamata; i dati freschi arrivano da me().
 *
 * RIFINITURA: il cambio password revoca TUTTE le sessioni sul backend
 * (ogni dispositivo). Per non buttare fuori anche l'utente che sta
 * cambiando, subito dopo si fa un login SILENZIOSO con la nuova
 * password: famiglia fresca per QUESTO dispositivo, gli altri restano
 * fuori. UX intatta, sicurezza piena.
 *
 * DISATTIVAZIONE (V18): reversibile e self-service, con conferma
 * password nel dialog. Al ritorno le sessioni server sono GIA' tutte
 * revocate: qui si fa SOLO pulizia locale (stesso trittico di
 * esci() in user-layout) e si torna alla home. Il rientro passera'
 * dalla registrazione: email nota -> proposta di riattivazione.
 */
@Component({
  selector: 'app-profilo',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule,
            MatInputModule, MatIconModule, MatDatepickerModule],
  // Il datepicker lavora con oggetti Date: il NativeDateAdapter li
  // formatta col locale italiano (gg/mm/aaaa), niente librerie in piu'.
  providers: [provideNativeDateAdapter(),
              { provide: MAT_DATE_LOCALE, useValue: 'it-IT' }],
  templateUrl: './profilo.html',
  styleUrl: './profilo.css',
})
export class Profilo {

  private authS = inject(AuthServices);
  private utenteS = inject(Utente);
  private portafoglioS = inject(Portafoglio);
  private carrelloS = inject(Carrello);
  private router = inject(Router);

  private dialogDisattiva = viewChild.required<ElementRef<HTMLDialogElement>>('dialogDisattiva');

  // --- Card 0: immagine profilo ---
  immagineProfilo = signal<string | null>(null);
  msgAvatar = signal<Esito>(null);

  /** Foto se c'e', altrimenti il default statico */
  get urlAvatar(): string {
    return urlImmagine(this.immagineProfilo()) ?? '/avatar-default.svg';
  }

  // --- Card 1: anagrafica ---
  fNome = ''; fCognome = ''; fUsername = '';
  fTelefono = ''; fCodiceFiscale = '';
  /** Date (non stringa): e' il tipo che il datepicker parla. */
  fDataNascita: Date | null = null;
  /** Limite del calendario: non si nasce nel futuro. */
  oggi = new Date();
  msgAnagrafica = signal<Esito>(null);

  // --- Card 2: email ---
  fNuovaEmail = ''; fPasswordEmail = '';
  emailAttuale = signal('');
  msgEmail = signal<Esito>(null);

  // --- Card 3: password ---
  fVecchia = ''; fNuova = ''; fConferma = '';
  msgPassword = signal<Esito>(null);

  // --- Card 4: disattivazione (V18) ---
  fPasswordDisattiva = '';
  fMotivoDisattiva = '';
  msgDisattiva = signal<Esito>(null);

  inCorso = signal(false);

  /** FIX: resetForm() scrive null nei campi legati — il getter deve
   *  sopravvivere sia a '' che a null, o esplode in change detection */
  get passwordNonCoincidono(): boolean {
    return !!this.fConferma && this.fNuova !== this.fConferma;
  }

  constructor() {
    // Dati FRESCHI dal token (me()). L'error handler c'e' apposta:
    // durante l'SSR queste chiamate partono senza sessione e falliscono
    // per design — il guscio si renderizza lo stesso, ci pensa il
    // client dopo l'hydration. Mai piu' errori non gestiti nel render.
    this.utenteS.me().subscribe({
      next: u => this.popolaDa(u),
      error: () => {}
    });
  }

  private popolaDa(u: UtenteDTO): void {
    this.fNome = u.nome;
    this.fCognome = u.cognome;
    this.fUsername = u.username;
    this.fTelefono = u.telefono ?? '';
    this.fDataNascita = u.dataNascita ? new Date(u.dataNascita) : null;
    this.fCodiceFiscale = u.codiceFiscale ?? '';
    this.emailAttuale.set(u.email);
    this.immagineProfilo.set(u.immagineProfilo);
  }

  /** Sessione aggiornata = chip in topbar aggiornato in diretta */
  private aggiornaSessione(u: UtenteDTO): void {
    this.authS.login(u);
    this.popolaDa(u);
  }

  // ------------------------------------------------------------------
  // Card 0: avatar
  // ------------------------------------------------------------------

  caricaAvatar(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || this.inCorso()) return;

    const form = new FormData();
    form.append('file', file);
    this.inCorso.set(true);
    this.msgAvatar.set(null);

    this.utenteS.uploadImmagineProfilo(form)
      .subscribe({
        next: u => {
          this.aggiornaSessione(u);   // popola anche immagineProfilo -> anteprima e chip
          this.msgAvatar.set({ testo: 'Immagine aggiornata.', errore: false });
          this.inCorso.set(false);
        },
        error: err => { this.msgAvatar.set(this.esitoErrore(err)); this.inCorso.set(false); }
      });
    input.value = '';   // permette di ricaricare lo stesso file
  }

  rimuoviAvatar(): void {
    if (this.inCorso() || !this.immagineProfilo()) return;
    this.inCorso.set(true);
    this.msgAvatar.set(null);

    this.utenteS.removeImmagineProfilo()
      .subscribe({
        next: u => {
          this.aggiornaSessione(u);
          this.msgAvatar.set({ testo: 'Immagine rimossa: torna quella predefinita.', errore: false });
          this.inCorso.set(false);
        },
        error: err => { this.msgAvatar.set(this.esitoErrore(err)); this.inCorso.set(false); }
      });
  }

  // ------------------------------------------------------------------
  // Card 1: anagrafica (patch: i campi vuoti facoltativi viaggiano null)
  // ------------------------------------------------------------------

  salvaAnagrafica(): void {
    if (this.inCorso()) return;
    this.inCorso.set(true);
    this.msgAnagrafica.set(null);

    this.utenteS.updateProfilo({
      nome: this.fNome.trim(),
      cognome: this.fCognome.trim(),
      // Username invariato: il campo e' disabilitato in UI, ma il
      // valore viaggia lo stesso perche' il Req backend lo prevede.
      // Il cambio vero sara' un'operazione admin dedicata (futura).
      username: this.fUsername.trim(),
      telefono: this.fTelefono.trim() || null,
      dataNascita: this.dataIso(this.fDataNascita),
      codiceFiscale: this.fCodiceFiscale.trim().toUpperCase() || null,
    }).subscribe({
      next: u => {
        this.aggiornaSessione(u);
        this.msgAnagrafica.set({ testo: 'Dati aggiornati.', errore: false });
        this.inCorso.set(false);
      },
      error: err => { this.msgAnagrafica.set(this.esitoErrore(err)); this.inCorso.set(false); }
    });
  }

  // ------------------------------------------------------------------
  // Card 2: email (operazione sensibile: riconferma password)
  // ------------------------------------------------------------------

  salvaEmail(form: NgForm): void {
    if (this.inCorso()) return;
    this.inCorso.set(true);
    this.msgEmail.set(null);

    this.utenteS.changeEmail(this.fNuovaEmail.trim(), this.fPasswordEmail)
      .subscribe({
        next: u => {
          this.aggiornaSessione(u);
          form.resetForm();       // azzera valori E stato touched: niente rosso
          this.msgEmail.set({
            testo: 'Email aggiornata: dal prossimo accesso usa la nuova (o lo username).',
            errore: false
          });
          this.inCorso.set(false);
        },
        error: err => { this.msgEmail.set(this.esitoErrore(err)); this.inCorso.set(false); }
      });
  }

  // ------------------------------------------------------------------
  // Card 3: password — revoca globale + rientro silenzioso
  // ------------------------------------------------------------------

  salvaPassword(form: NgForm): void {
    if (this.inCorso() || this.passwordNonCoincidono) return;
    this.inCorso.set(true);
    this.msgPassword.set(null);

    // Fotografati PRIMA del resetForm: dopo, i campi sono null
    const username = this.authS.utente()!.username;
    const nuovaPassword = this.fNuova;

    this.utenteS.changePassword(this.fVecchia, this.fNuova)
      .subscribe({
        next: () => {
          form.resetForm();
          // Il backend ha appena revocato TUTTE le sessioni, compresa
          // la nostra: login silenzioso con la nuova password ->
          // famiglia fresca per questo dispositivo, gli altri fuori.
          this.utenteS.loginUtente(username, nuovaPassword).subscribe({
            next: () => {
              this.msgPassword.set({
                testo: 'Password aggiornata. Le sessioni sugli altri dispositivi sono state disconnesse.',
                errore: false
              });
              this.inCorso.set(false);
            },
            error: () => {
              // improbabile (password appena impostata): fallback pulito
              this.authS.resetAll();
              this.router.navigate(['/login']);
            }
          });
        },
        error: err => { this.msgPassword.set(this.esitoErrore(err)); this.inCorso.set(false); }
      });
  }

  // ------------------------------------------------------------------
  // Card 4: disattivazione account (V18)
  // ------------------------------------------------------------------

  apriDisattiva(): void {
    this.fPasswordDisattiva = '';
    this.fMotivoDisattiva = '';
    this.msgDisattiva.set(null);
    this.dialogDisattiva().nativeElement.showModal();
  }

  chiudiDisattiva(): void {
    this.dialogDisattiva().nativeElement.close();
  }

  confermaDisattiva(): void {
    if (this.inCorso() || !this.fPasswordDisattiva) return;
    this.inCorso.set(true);
    this.msgDisattiva.set(null);

    this.utenteS.disattivaAccount(this.fPasswordDisattiva,
        this.fMotivoDisattiva.trim() || null)
      .subscribe({
        next: () => {
          // Le sessioni server sono GIA' tutte revocate: solo pulizia
          // locale, lo stesso trittico dell'esci() di user-layout.
          this.chiudiDisattiva();
          this.authS.resetAll();
          this.portafoglioS.azzeraSaldo();
          this.carrelloS.azzera();
          this.router.navigate(['/']);
        },
        error: err => {
          // Il dialog resta aperto: l'errore (password errata) si
          // legge nel contesto in cui e' nato.
          this.msgDisattiva.set(this.esitoErrore(err));
          this.inCorso.set(false);
        }
      });
  }

  /** Date -> 'yyyy-MM-dd' (il formato del DTO), in ora LOCALE:
   *  toISOString() userebbe UTC e a mezzanotte sbaglierebbe giorno. */
  private dataIso(d: Date | null): string | null {
    if (!d) return null;
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const gg = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${gg}`;
  }

  private esitoErrore(err: any): Esito {
    return { testo: err.error?.msg ?? 'Errore di comunicazione col server', errore: true };
  }

}