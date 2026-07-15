import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Utente } from '../../services/utente';

@Component({
  selector: 'app-registrazione',
  imports: [
    RouterLink,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './registrazione.html',
  styleUrl: './registrazione.css',
})
export class Registrazione {
  private utenteS = inject(Utente);
  private router = inject(Router);

  nome = '';
  cognome = '';
  email = '';
  telefono = '';
  dataNascita = '';
  codiceFiscale = '';
  password = '';

  errore = signal<string | null>(null);
  inCorso = signal(false);

  registrati(): void {
    this.errore.set(null);
    this.inCorso.set(true);

    this.utenteS.registraUtente({
      nome: this.nome,
      cognome: this.cognome,
      email: this.email,
      telefono: this.telefono,
      dataNascita: this.dataNascita,
      codiceFiscale: this.codiceFiscale,
      password: this.password
    }).subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.errore.set(err.error?.msg ?? 'Errore durante la registrazione');
        this.inCorso.set(false);
      }
    });
  }
}