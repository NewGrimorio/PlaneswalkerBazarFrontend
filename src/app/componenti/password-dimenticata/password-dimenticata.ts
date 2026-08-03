import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { environment } from '../../../environments/environment';

const BASE = environment.apiUrl;

interface ResetPasswordDTO { msg: string; token: string | null; }

/**
 * Passo 1 del reset: l'utente inserisce l'email.
 *
 * SICUREZZA: la risposta del backend e' IDENTICA con email esistente
 * o assente ("Se l'email e' registrata riceverai le istruzioni") —
 * il form non rivela chi e' registrato. In produzione il token
 * viaggerebbe SOLO via email; in sviluppo il backend lo espone nella
 * risposta (app.reset.esponi-token) per simulare il click sul link:
 * se arriva, si naviga direttamente alla pagina di reimpostazione.
 */
@Component({
  selector: 'app-password-dimenticata',
  imports: [FormsModule, RouterLink, MatCardModule, MatFormFieldModule,
            MatInputModule, MatButtonModule],
  templateUrl: './password-dimenticata.html',
  styleUrl: './password-dimenticata.css',
})
export class PasswordDimenticata {
  private http = inject(HttpClient);
  private router = inject(Router);

  email = '';
  inCorso = signal(false);
  esito = signal<string | null>(null);
  errore = signal<string | null>(null);

  invia(): void {
    const email = this.email.trim();
    if (!email || this.inCorso()) return;
    this.inCorso.set(true);
    this.errore.set(null);

    this.http.post<ResetPasswordDTO>(`${BASE}/auth/password/reset-richiesta`, { email })
      .subscribe({
        next: r => {
          this.inCorso.set(false);
          if (r.token) {
            // Sviluppo: il token simula il link dell'email
            this.router.navigate(['/reimposta-password'], { queryParams: { token: r.token } });
          } else {
            this.esito.set(r.msg);   // produzione: si aspetta l'email
          }
        },
        error: err => {
          this.inCorso.set(false);
          this.errore.set(err?.error?.msg ?? 'Richiesta non riuscita, riprova');
        }
      });
  }
}