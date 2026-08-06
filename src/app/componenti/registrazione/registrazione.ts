import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { switchMap } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Utente } from '../../services/utente';

/**
 * Registrazione + aggancio alla RIATTIVAZIONE (V18).
 *
 * Il backend risponde 409 CONFLICT quando l'email appartiene a un
 * account DISATTIVATO: e' lo STATUS il segnale (mai il testo del
 * messaggio, che puo' cambiare in messaggi_sistema senza rompere la
 * UI). Al 409 si apre il dialog "Desideri riattivare il vecchio
 * account?": la conferma chiama /auth/riattivazione/richiesta, che
 * risponde in modo identico per ogni esito (anti-enumerazione).
 * In sviluppo il token arriva nella risposta e si naviga dritti a
 * reimposta-password (stessa pagina del reset: la conferma riattiva
 * da sola); in produzione si mostra il messaggio "controlla l'email".
 */
@Component({
  selector: 'app-registrazione',
  imports: [RouterLink, FormsModule, MatCardModule,
            MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './registrazione.html',
  styleUrl: './registrazione.css',
})
export class Registrazione {

  private utenteS = inject(Utente);
  private router = inject(Router);

  private dialogRiattiva = viewChild.required<ElementRef<HTMLDialogElement>>('dialogRiattiva');

  // Obbligatori (gruppo Create della UtenteReq)
  email = '';
  username = '';
  password = '';
  confermaPassword = '';   // solo client: il backend non la riceve
  nome = '';
  cognome = '';

  // Facoltativi
  telefono = '';
  dataNascita = '';        // input type="date" -> "YYYY-MM-DD", pronto per LocalDate
  codiceFiscale = '';

  errore = signal<string | null>(null);
  inCorso = signal(false);

  // --- Riattivazione (V18) ---
  messaggioRiattiva = signal<string | null>(null);   // testo nel dialog (dal backend)
  esitoRiattiva = signal<string | null>(null);       // "controlla l'email" (produzione)
  inCorsoRiattiva = signal(false);

  get passwordNonCoincidono(): boolean {
    return !!this.confermaPassword && this.password !== this.confermaPassword;
  }

  registrati(): void {
    if (this.passwordNonCoincidono || this.inCorso()) return;
    this.errore.set(null);
    this.esitoRiattiva.set(null);
    this.inCorso.set(true);

    // Facoltativi vuoti -> null: @Pattern salta i null ma boccia le ""
    const req = {
      email: this.email,
      username: this.username.trim(),
      password: this.password,
      nome: this.nome.trim(),
      cognome: this.cognome.trim(),
      telefono: this.telefono.trim() || null,
      dataNascita: this.dataNascita || null,
      codiceFiscale: this.codiceFiscale.trim().toUpperCase() || null,
    };

    // La registrazione risponde con l'utente ma SENZA token (per
    // design: il backend e i suoi test restano intatti). Il login
    // concatenato subito dopo procura i token e popola AuthServices
    // (via tap nel service): registrato = loggato PER DAVVERO.
    this.utenteS.registraUtente(req).pipe(
      switchMap(() => this.utenteS.loginUtente(this.email, this.password))
    ).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => {
        this.inCorso.set(false);
        if (err.status === 409) {
          // Account DISATTIVATO su questa email: si propone la riattivazione
          this.messaggioRiattiva.set(
            err.error?.msg ?? 'Questa email appartiene a un account disattivato');
          this.dialogRiattiva().nativeElement.showModal();
          return;
        }
        this.errore.set(err.error?.msg ?? 'Errore di comunicazione col server');
      }
    });
  }

  chiudiRiattiva(): void {
    this.dialogRiattiva().nativeElement.close();
  }

  /** "Si', riattiva": stessa meccanica dev/prod di password-dimenticata. */
  confermaRiattiva(): void {
    if (this.inCorsoRiattiva()) return;
    this.inCorsoRiattiva.set(true);

    this.utenteS.riattivazioneRichiesta(this.email.trim()).subscribe({
      next: r => {
        this.inCorsoRiattiva.set(false);
        this.chiudiRiattiva();
        if (r.token) {
          // Sviluppo: il token simula il link dell'email
          this.router.navigate(['/reimposta-password'], { queryParams: { token: r.token } });
        } else {
          this.esitoRiattiva.set(r.msg);   // produzione: si aspetta l'email
        }
      },
      error: err => {
        this.inCorsoRiattiva.set(false);
        this.chiudiRiattiva();
        this.errore.set(err?.error?.msg ?? 'Richiesta non riuscita, riprova');
      }
    });
  }
}