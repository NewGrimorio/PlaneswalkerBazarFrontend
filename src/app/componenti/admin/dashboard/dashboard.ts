import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { DashboardDTO } from '../../../modelli/dashboard-dto';
import { environment } from '../../../../environments/environment';

const BASE = environment.apiUrl

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, MatCardModule, MatIconModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {
  private http = inject(HttpClient);

  stats = signal<DashboardDTO | null>(null);
  erroreStats = signal(false);

  /** Una tessera per ogni controller admin del backend */
  sezioni = [
    { titolo: 'Sincronizza set',  icona: 'cloud_download',  link: '/admin/sync',
      descrizione: 'Importa espansioni e carte da Scryfall' },
    { titolo: 'Prodotti',         icona: 'inventory_2',     link: '/admin/prodotti',
      descrizione: 'Sigillato, accessori e lotti' },
    { titolo: 'Magazzino',        icona: 'warehouse',       link: '/admin/magazzino',
      descrizione: 'Carte singole, varianti, prezzi e giacenze' },
    { titolo: 'Ordini',           icona: 'local_shipping',  link: '/admin/ordini',
      descrizione: 'Spedizioni, cancellazioni e rimborsi' },
    { titolo: 'Movimenti',        icona: 'account_balance', link: '/admin/movimenti',
      descrizione: 'Bonifici in attesa di conferma' },
    { titolo: 'Recensioni',       icona: 'rate_review',     link: '/admin/recensioni',
      descrizione: 'Moderazione' },
  ];

  constructor() {
    this.http.get<DashboardDTO>(`${BASE}/admin/dashboard`)
      .subscribe({
        next: s => this.stats.set(s),
        error: err => {
          console.error('Dashboard stats non disponibili:', err);
          this.erroreStats.set(true);
        }
      });

  }

}