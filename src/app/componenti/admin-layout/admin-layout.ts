import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthServices } from '../../auth/auth-services';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule, MatMenuModule],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css'
})
export class AdminLayout {
  private authS = inject(AuthServices);
  private router = inject(Router);

  utente = this.authS.utente;

  voci = [
    { titolo: 'Dashboard',       icona: 'space_dashboard', link: '/admin' },
    { titolo: 'Sincronizza set', icona: 'cloud_download',  link: '/admin/sync' },
    { titolo: 'Prodotti',        icona: 'inventory_2',     link: '/admin/prodotti' },
    { titolo: 'Magazzino',       icona: 'warehouse',       link: '/admin/magazzino' },
    { titolo: 'Ordini',          icona: 'local_shipping',  link: '/admin/ordini' },
    { titolo: 'Movimenti',       icona: 'account_balance', link: '/admin/movimenti' },
    { titolo: 'Recensioni',      icona: 'rate_review',     link: '/admin/recensioni' },
  ];

  /** Iniziali per l'avatar del chip utente */
  get iniziali(): string {
    const u = this.utente();
    if (!u) return '';
    return ((u.nome?.[0] ?? '') + (u.cognome?.[0] ?? '')).toUpperCase();
  }

  esci(): void {
    this.authS.resetAll();
    this.router.navigate(['/login']);
  }
  
}