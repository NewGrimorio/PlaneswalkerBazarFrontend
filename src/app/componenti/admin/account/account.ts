import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule, NgForm } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../../environments/environment';
import { AuthServices } from '../../../auth/auth-services';
import { UtenteDTO } from '../../../modelli/utente-dto';
import { IndirizzoDTO } from '../../../modelli/indirizzo-dto';

const BASE = environment.apiUrl;

type Esito = { testo: string; errore: boolean } | null;

@Component({
  selector: 'app-account',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule,
            MatInputModule, MatIconModule],
  templateUrl: './account.html',
  styleUrl: './account.css',
})
export class Account {

  private http = inject(HttpClient);
  private authS = inject(AuthServices);

  private utenteId = this.authS.utente()!.id;

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
    // Dati FRESCHI dal backend, mai dal localStorage (puo' essere stantio)
    this.http.get<UtenteDTO>(`${BASE}/utenti/${this.utenteId}`)
      .subscribe({ next: u => this.popolaDa(u) });
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
  }

  /** Sessione aggiornata = chip in topbar aggiornato in diretta */
  private aggiornaSessione(u: UtenteDTO): void {
    this.authS.login(u);
    this.popolaDa(u);
  }

  // ------------------------------------------------------------------
  // Card 1: anagrafica (patch: i campi vuoti facoltativi viaggiano null)
  // ------------------------------------------------------------------

  salvaAnagrafica(): void {
    if (this.inCorso()) return;
    this.inCorso.set(true);
    this.msgAnagrafica.set(null);

    this.http.put<UtenteDTO>(`${BASE}/utenti/profilo`, {
      id: this.utenteId,
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

  salvaEmail(form: NgForm): void {                            // FIX: riceve il form
    if (this.inCorso()) return;
    this.inCorso.set(true);
    this.msgEmail.set(null);

    this.http.put<UtenteDTO>(`${BASE}/utenti/email`, {
      utenteId: this.utenteId,
      nuovaEmail: this.fNuovaEmail.trim(),
      password: this.fPasswordEmail,
    }).subscribe({
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
  // Card 3: password (la vecchia si verifica sul server, come da service)
  // ------------------------------------------------------------------

  salvaPassword(form: NgForm): void {                         // FIX: riceve il form
    if (this.inCorso() || this.passwordNonCoincidono) return;
    this.inCorso.set(true);
    this.msgPassword.set(null);

    this.http.put<UtenteDTO>(`${BASE}/utenti/password`, {
      utenteId: this.utenteId,
      vecchiaPassword: this.fVecchia,
      nuovaPassword: this.fNuova,
    }).subscribe({
      next: () => {
        form.resetForm();       // azzera valori E stato touched: niente rosso
        this.msgPassword.set({ testo: 'Password aggiornata.', errore: false });
        this.inCorso.set(false);
      },
      error: err => { this.msgPassword.set(this.esitoErrore(err)); this.inCorso.set(false); }
    });
  }

  // ------------------------------------------------------------------
  // Card 4: indirizzi (entita' a lista, con predefinito)
  // ------------------------------------------------------------------

  private caricaIndirizzi(): void {
    this.http.get<IndirizzoDTO[]>(`${BASE}/indirizzi`,
        { params: { utenteId: this.utenteId } })
      .subscribe({ next: l => this.indirizzi.set(l) });
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
      utenteId: this.utenteId,
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
      ? this.http.post<IndirizzoDTO>(`${BASE}/indirizzi`, corpo)
      : this.http.put<IndirizzoDTO>(`${BASE}/indirizzi`, { ...corpo, id: idInModifica });

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
    this.http.delete(`${BASE}/indirizzi/${i.id}`,
        { params: { utenteId: this.utenteId } })
      .subscribe({
        next: () => this.caricaIndirizzi(),
        error: err => this.msgIndirizzi.set(this.esitoErrore(err))
      });
  }

  setPredefinito(i: IndirizzoDTO): void {
    if (i.predefinito) return;
    this.http.post(`${BASE}/indirizzi/${i.id}/set-predefinito`, null,
        { params: { utenteId: this.utenteId } })
      .subscribe({
        next: () => this.caricaIndirizzi(),
        error: err => this.msgIndirizzi.set(this.esitoErrore(err))
      });
  }

  private esitoErrore(err: any): Esito {
    return { testo: err.error?.msg ?? 'Errore di comunicazione col server', errore: true };
  }
  
}