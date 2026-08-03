import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
 * Passo 2 del reset: nuova password. Il token arriva dalla query
 * string (?token=...) — in produzione sarebbe il link dell'email, in
 * sviluppo ci si arriva direttamente dal passo 1. Il token e' MONOUSO
 * e a scadenza breve: se il backend lo rifiuta, l'unica strada e'
 * richiederne uno nuovo. La conferma password e' un controllo di
 * cortesia lato client; le regole vere (lunghezza) le impone il
 * server con i suoi messaggi.
 */
@Component({
  selector: 'app-reimposta-password',
  imports: [FormsModule, RouterLink, MatCardModule, MatFormFieldModule,
            MatInputModule, MatButtonModule],
  templateUrl: './reimposta-password.html',
  styleUrl: './reimposta-password.css',
})
export class ReimpostaPassword {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);

  private token: string | null = null;

  password = '';
  conferma = '';
  inCorso = signal(false);
  esito = signal<string | null>(null);
  errore = signal<string | null>(null);
  senzaToken = signal(false);

  constructor() {
    this.route.queryParamMap.subscribe(qm => {
      this.token = qm.get('token');
      this.senzaToken.set(!this.token);
    });
  }

  invia(): void {
    if (this.inCorso() || !this.token) return;
    if (this.password !== this.conferma) {
      this.errore.set('Le due password non coincidono');
      return;
    }
    this.inCorso.set(true);
    this.errore.set(null);

    this.http.post<ResetPasswordDTO>(`${BASE}/auth/password/reset-conferma`,
        { token: this.token, nuovaPassword: this.password })
      .subscribe({
        next: r => {
          this.inCorso.set(false);
          this.esito.set(r.msg);
        },
        error: err => {
          this.inCorso.set(false);
          this.errore.set(err?.error?.msg ?? 'Operazione non riuscita, riprova');
        }
      });
  }

  vaiAlLogin(): void { this.router.navigate(['/login']); }
}