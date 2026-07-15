import { Component, inject, signal} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Utente } from '../../services/utente';
import { AuthServices } from '../../auth/auth-services';

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormsModule, MatCardModule,
            MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})

export class Login {

  private utenteS = inject(Utente);
  private router = inject(Router);
  private authS = inject(AuthServices); 

  email = '';
  password = '';
  errore = signal<string | null>(null);
  inCorso = signal(false);

  accediAlSito(): void {
    this.errore.set(null);
    this.inCorso.set(true);
    this.utenteS.loginUtente(this.email, this.password).subscribe({
      next: (utente) => {
        console.log('Login riuscito:', utente);
        this.authS.login(utente);
        this.router.navigate([this.authS.isRoleAdmin() ? '/admin' : '/']);
      },
      error: (err) => {
        this.errore.set(err.error?.msg ?? 'Errore di comunicazione col server');
        this.inCorso.set(false);
      }
    });
  }

}