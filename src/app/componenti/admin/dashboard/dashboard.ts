import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { DashboardDTO } from '../../../modelli/dashboard-dto';
import { MagazzinoSKUDTO } from '../../../modelli/magazzino-sku-dto';
import { environment } from '../../../../environments/environment';

const BASE = environment.apiUrl;

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

  // --- Pannello "sotto scorta" ---
  scorte = signal<MagazzinoSKUDTO[]>([]);
  scorteAperte = signal(false);
  caricandoScorte = signal(false);

  /**
   * I contatori. tipo 'pannello' = il click apre un pannello a scomparsa
   * (SKU sotto scorta, con la lista dei prodotti da rifornire); tipo
   * 'link' = naviga alla coda. 'azionabile' evidenzia quando c'e' lavoro.
   */
  contatori = computed(() => {
    const s = this.stats();
    if (!s) return [];
    return [
      { label: 'Ordini da spedire',    icona: 'local_shipping',  valore: s.ordiniDaSpedire,      tipo: 'link' as const,     link: '/admin/ordini',     azionabile: true },
      { label: 'Bonifici in attesa',   icona: 'account_balance', valore: s.bonificiInAttesa,     tipo: 'link' as const,     link: '/admin/movimenti',  azionabile: true },
      { label: 'SKU sotto scorta',     icona: 'warning',         valore: s.skuSottoScorta,       tipo: 'pannello' as const, link: '',                  azionabile: true },
      { label: 'Recensioni pubblicate',icona: 'rate_review',     valore: s.recensioniPubblicate, tipo: 'link' as const,     link: '/admin/recensioni', azionabile: false },
    ];
  });

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
      descrizione: 'Bonifici e storico transazioni' },
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

  /** Apre/chiude il pannello sotto scorta; all'apertura (ri)carica la lista. */
  toggleScorte(): void {
    const apri = !this.scorteAperte();
    this.scorteAperte.set(apri);
    if (apri) this.caricaScorte();
  }

  private caricaScorte(): void {
    this.caricandoScorte.set(true);
    this.http.get<MagazzinoSKUDTO[]>(`${BASE}/admin/dashboard/sotto-scorta`)
      .subscribe({
        next: l => { this.scorte.set(l); this.caricandoScorte.set(false); },
        error: () => { this.scorte.set([]); this.caricandoScorte.set(false); }
      });
  }

  /** Variante leggibile: "NM · en · NONFOIL", saltando le sentinelle NA. */
  variante(s: MagazzinoSKUDTO): string {
    const parti: string[] = [];
    if (s.condizione && s.condizione !== 'NA') parti.push(s.condizione);
    if (s.lingua) parti.push(s.lingua);
    if (s.finitura) parti.push(s.finitura);
    return parti.join(' · ');
  }
}