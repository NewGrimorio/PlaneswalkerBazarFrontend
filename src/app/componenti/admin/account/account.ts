import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { AuthServices } from '../../../auth/auth-services';
import { Utente } from '../../../services/utente';
import { Indirizzo } from '../../../services/indirizzo';
import { UtenteDTO } from '../../../modelli/utente-dto';
import { IndirizzoDTO } from '../../../modelli/indirizzo-dto';
import { urlImmagine } from '../../../utils/url-immagine';

type Esito = { testo: string; errore: boolean } | null;

/**
 * FASE C: l'account non conosce piu' il proprio id. "Chi sono" lo
 * dice il token a ogni chiamata; i dati freschi arrivano da me()
 * (era getById(id)), e nessun utenteId parte piu' da qui.
 *
 * RIFINITURA: il cambio password revoca TUTTE le sessioni sul backend
 * (ogni dispositivo). Per non buttare fuori anche l'utente che sta
 * cambiando, subito dopo si fa un login SILENZIOSO con la nuova
 * password: famiglia fresca per QUESTO dispositivo, gli altri restano
 * fuori. UX intatta, sicurezza piena.
 */
@Component({
  selector: 'app-account',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule,
            MatInputModule, MatIconModule],
  templateUrl: './account.html',
  styleUrl: './account.css',
})
export class Account {

  private authS = inject(AuthServices);
  private utenteS = inject(Utente);
  private indirizzoS = inject(Indirizzo);
  private router = inject(Router);

   // --- Card 0: immagine profilo ---
  immagineProfilo = signal<string | null>(null);
  msgAvatar = signal<Esito>(null);

  /** Foto se c'e', altrimenti il default statico */
  get urlAvatar(): string {
    return urlImmagine(this.immagineProfilo()) ?? '/avatar-default.svg';
  }

  // --- Card 1: anagrafica ---
  fNome = ''; fCognome = ''; fUsername = '';
  fTelefono = ''; fDataNascita = ''; fCodiceFiscale = '';
  msgAnagrafica = signal<Esito>(null);

  // --- Card 2: email ---
  fNuovaEmail = ''; fPasswordEmail = '';
  emailAttuale = signal('');
  msgEmail = signal<Esito>(null);

  // --- Card 3: password ---
  fVecchia = ''; fNuova = ''; fConferma = '';
  msgPassword = signal<Esito>(null);

  // --- Card 4: indirizzi ---
  indirizzi = signal<IndirizzoDTO[]>([]);
  /** null = form chiuso; 0 = nuovo; >0 = id in modifica */
  formIndirizzo = signal<number | null>(null);
  iEtichetta = ''; iDestinatario = ''; iVia = ''; iCivico = '';
  iCap = ''; iCitta = ''; iProvincia = ''; iNazione = 'IT';
  msgIndirizzi = signal<Esito>(null);

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
    this.caricaIndirizzi();
  }

  private popolaDa(u: UtenteDTO): void {
    this.fNome = u.nome;
    this.fCognome = u.cognome;
    this.fUsername = u.username;
    this.fTelefono = u.telefono ?? '';
    this.fDataNascita = u.dataNascita ?? '';
    this.fCodiceFiscale = u.codiceFiscale ?? '';
    this.emailAttuale.set(u.email);
    this.immagineProfilo.set(u.immagineProfilo);
  }

  /** Sessione aggiornata = chip in topbar aggiornato in diretta */
  private aggiornaSessione(u: UtenteDTO): void {
    this.authS.login(u);
    this.popolaDa(u);
  }

  //AVATAR

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
      username: this.fUsername.trim(),
      telefono: this.fTelefono.trim() || null,
      dataNascita: this.fDataNascita || null,
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
  // Card 4: indirizzi (entita' a lista, con predefinito)
  // ------------------------------------------------------------------

  private caricaIndirizzi(): void {
    this.indirizzoS.list()
      .subscribe({
        next: l => this.indirizzi.set(l),
        error: () => {}   // SSR senza sessione: silenzio, ci pensa il client
      });
  }

  nuovoIndirizzo(): void {
    this.iEtichetta = this.iDestinatario = this.iVia = this.iCivico = '';
    this.iCap = this.iCitta = this.iProvincia = '';
    this.iNazione = 'IT';
    this.formIndirizzo.set(0);
  }

  modificaIndirizzo(i: IndirizzoDTO): void {
    this.iEtichetta = i.etichetta ?? '';
    this.iDestinatario = i.destinatario;
    this.iVia = i.via;
    this.iCivico = i.civico;
    this.iCap = i.cap;
    this.iCitta = i.citta;
    this.iProvincia = i.provincia ?? '';
    this.iNazione = i.nazione ?? 'IT';
    this.formIndirizzo.set(i.id);
  }

  salvaIndirizzo(): void {
    const idInModifica = this.formIndirizzo();
    if (idInModifica === null || this.inCorso()) return;
    this.inCorso.set(true);
    this.msgIndirizzi.set(null);

    const corpo: any = {
      etichetta: this.iEtichetta.trim() || null,
      destinatario: this.iDestinatario.trim(),
      via: this.iVia.trim(),
      civico: this.iCivico.trim(),
      cap: this.iCap.trim(),
      citta: this.iCitta.trim(),
      provincia: this.iProvincia.trim() || null,
      nazione: this.iNazione.trim().toUpperCase() || null,
    };

    const chiamata = idInModifica === 0
      ? this.indirizzoS.create(corpo)
      : this.indirizzoS.update({ ...corpo, id: idInModifica });

    chiamata.subscribe({
      next: () => {
        this.formIndirizzo.set(null);
        this.inCorso.set(false);
        this.caricaIndirizzi();
      },
      error: err => { this.msgIndirizzi.set(this.esitoErrore(err)); this.inCorso.set(false); }
    });
  }

  eliminaIndirizzo(i: IndirizzoDTO): void {
    this.indirizzoS.remove(i.id)
      .subscribe({
        next: () => this.caricaIndirizzi(),
        error: err => this.msgIndirizzi.set(this.esitoErrore(err))
      });
  }

  setPredefinito(i: IndirizzoDTO): void {
    if (i.predefinito) return;
    this.indirizzoS.setPredefinito(i.id)
      .subscribe({
        next: () => this.caricaIndirizzi(),
        error: err => this.msgIndirizzi.set(this.esitoErrore(err))
      });
  }

  private esitoErrore(err: any): Esito {
    return { testo: err.error?.msg ?? 'Errore di comunicazione col server', errore: true };
  }
  
}