import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthServices } from '../../auth/auth-services';
import { Utente } from '../../services/utente';
import { urlImmagine } from '../../utils/url-immagine';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule, MatMenuModule],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css'
})
export class AdminLayout {
  private authS = inject(AuthServices);
  private utenteS = inject(Utente);
  private router = inject(Router);

  utente = this.authS.utente;

  /** Esposta al template: le funzioni importate non sono visibili da sole */
  protected readonly urlImmagine = urlImmagine;

  voci = [
    { titolo: 'Dashboard',       icona: 'space_dashboard', link: '/admin' },
    { titolo: 'Sincronizza set', icona: 'cloud_download',  link: '/admin/sync' },
    { titolo: 'Prodotti',        icona: 'inventory_2',     link: '/admin/prodotti' },
    { titolo: 'Magazzino',       icona: 'warehouse',       link: '/admin/magazzino' },
    { titolo: 'Ordini',          icona: 'local_shipping',  link: '/admin/ordini' },
    { titolo: 'Movimenti',       icona: 'account_balance', link: '/admin/movimenti' },
    { titolo: 'Recensioni',      icona: 'rate_review',     link: '/admin/recensioni' },
  ];

  /**
   * Logout VERO (Fase B): prima il backend — revoca la famiglia dei
   * refresh token e azzera il cookie — poi lo stato locale. Anche se
   * il backend non risponde, lo stato locale si pulisce comunque:
   * l'utente non deve mai restare intrappolato dentro.
   */
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