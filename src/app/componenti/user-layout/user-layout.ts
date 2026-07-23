import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { AuthServices } from '../../auth/auth-services';
import { Utente } from '../../services/utente';

/**
 * Shell dell'area cliente: nav orizzontale + outlet.
 * Speculare ad AdminLayout, ma il CSS resta locale al componente
 * (view encapsulation): non serve un foglio globale come admin.css.
 */
@Component({
  selector: 'app-user-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet,
            MatIconModule, MatMenuModule, MatButtonModule],
  templateUrl: './user-layout.html',
  styleUrl: './user-layout.css',
})
export class UserLayout {
  private router = inject(Router);
  private utenteS = inject(Utente);
  authS = inject(AuthServices);

  categorie = [
    { path: 'carte-singole', label: 'Carte singole' },
    { path: 'bustine',       label: 'Bustine' },
    { path: 'box',           label: 'Box' },
    { path: 'mazzi',         label: 'Mazzi' },
    { path: 'lotti',         label: 'Lotti' },
    { path: 'sigillato',     label: 'Sigillato' },
    { path: 'accessori',     label: 'Accessori' },
  ];

  /** Il backend deve revocare il refresh token: pulire solo lo stato
   *  Angular lascerebbe viva la sessione sul server. Il reset avviene
   *  comunque, anche se la chiamata fallisce. */
  esci(): void {
    this.utenteS.logout().subscribe({
      next: () => this.chiudiSessione(),
      error: () => this.chiudiSessione()
    });
  }

  private chiudiSessione(): void {
    this.authS.resetAll();
    this.router.navigate(['/login']);
  }
}