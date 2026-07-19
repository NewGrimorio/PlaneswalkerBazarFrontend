import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { environment } from '../../../environments/environment';
import { UtenteDTO } from '../../modelli/utente-dto';
import { AuthServices } from '../../auth/auth-services';

const BASE = environment.apiUrl;

@Component({
  selector: 'app-registrazione',
  imports: [RouterLink, FormsModule, MatCardModule,
            MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './registrazione.html',
  styleUrl: './registrazione.css',
})
export class Registrazione {

  private http = inject(HttpClient);
  private authS = inject(AuthServices);
  private router = inject(Router);

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

  get passwordNonCoincidono(): boolean {
    return !!this.confermaPassword && this.password !== this.confermaPassword;
  }

  registrati(): void {
    if (this.passwordNonCoincidono || this.inCorso()) return;
    this.errore.set(null);
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

    this.http.post<UtenteDTO>(`${BASE}/utenti/registrazione`, req).subscribe({
      next: (utente) => {
        this.authS.login(utente);      // registrato = gia' autenticato
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.errore.set(err.error?.msg ?? 'Errore di comunicazione col server');
        this.inCorso.set(false);
      }
    });
  }
}