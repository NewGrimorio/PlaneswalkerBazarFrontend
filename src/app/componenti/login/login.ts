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
  private authS = inject(AuthServices);
  private router = inject(Router);

  identificativo = '';
  password = '';
  errore = signal<string | null>(null);
  inCorso = signal(false);

  // Dove va il cliente dopo il login. TEMPORANEO: finche' la homepage
  // e' in lavorazione, si atterra sul negozio. Quando la home sara'
  // pronta, riportare a '/'.
  private readonly dopoLoginCliente = '/negozio';

  constructor() {
    // Utente gia' loggato che finisce sul login (es. F5 su /login):
    // si attende il bootstrap e poi lo si rimanda a casa. Sul server
    // pronta() e' gia' risolta e authS e' vuoto: nessun redirect SSR.
    this.authS.pronta().then(() => {
      if (this.authS.isAutentificated())
        this.router.navigate([this.authS.isRoleAdmin() ? '/admin' : this.dopoLoginCliente]);
    });
  }

  accediAlSito(): void {
    this.errore.set(null);
    this.inCorso.set(true);
    this.utenteS.loginUtente(this.identificativo, this.password).subscribe({
      next: (utente) => {
        this.authS.login(utente);
        this.router.navigate([this.authS.isRoleAdmin() ? '/admin' : this.dopoLoginCliente]);
      },
      error: (err) => {
        this.errore.set(err.error?.msg ?? 'Errore di comunicazione col server');
        this.inCorso.set(false);
      }
    });
  }
  
}