import { Component, computed, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Vendite } from '../../../services/vendite';
import { VendutoTopDTO } from '../../../modelli/venduto-top-dto';

type Toast = { testo: string; errore: boolean } | null;

/**
 * Analisi vendite lato ADMIN (rotta /admin/vendite): la classifica
 * del pubblico ma CON i ricavi, su finestre selezionabili, e il menu
 * Esporta (a destra) per scaricare xlsx o CSV — una riga per voce
 * d'ordine, per le analisi in Excel.
 *
 * Il download passa da un blob: il Bearer vive in memoria e viaggia
 * solo nell'interceptor, un <a href> nudo arriverebbe senza token.
 */
@Component({
  selector: 'app-vendite-admin',
  imports: [DecimalPipe, MatIconModule, MatMenuModule],
  templateUrl: './vendite.html',
  styleUrl: './vendite.css',
})
export class VenditeAdmin {
  private venditeS = inject(Vendite);
  private platformId = inject(PLATFORM_ID);

  finestre = [
    { v: 7,   l: 'Ultimi 7 giorni' },
    { v: 30,  l: 'Ultimi 30 giorni' },
    { v: 90,  l: 'Ultimi 90 giorni' },
    { v: 365, l: 'Ultimo anno' },
  ];

  giorni = signal(7);
  classifica = signal<VendutoTopDTO[]>([]);
  caricando = signal(false);
  scaricando = signal(false);
  messaggio = signal<Toast>(null);

  massimo = computed(() => this.classifica()[0]?.quantita ?? 1);
  totaleCopie = computed(() =>
      this.classifica().reduce((s, t) => s + t.quantita, 0));
  totaleRicavo = computed(() =>
      this.classifica().reduce((s, t) => s + (t.ricavo ?? 0), 0));

  constructor() {
    if (isPlatformBrowser(this.platformId)) this.carica();
  }

  cambiaFinestra(v: number): void {
    if (this.giorni() === v) return;
    this.giorni.set(v);
    this.carica();
  }

  private carica(): void {
    this.caricando.set(true);
    this.venditeS.topAdmin(this.giorni(), 10).subscribe({
      next: l => { this.classifica.set(l); this.caricando.set(false); },
      error: err => {
        this.classifica.set([]); this.caricando.set(false);
        this.toast(err?.error?.msg ?? 'Errore nel caricamento', true);
      }
    });
  }

  larghezza(t: VendutoTopDTO): string {
    return Math.max(6, Math.round(t.quantita / this.massimo() * 100)) + '%';
  }

  /** Download come blob (nome file ricomposto uguale al server).
   *  Un metodo per entrambi i formati: cambia solo l'endpoint —
   *  xlsx per lavorarci in Excel, csv per l'interoperabilita'. */
  scarica(formato: 'xlsx' | 'csv'): void {
    if (this.scaricando()) return;
    this.scaricando.set(true);
    const chiamata = formato === 'xlsx'
        ? this.venditeS.exportXlsx(this.giorni())
        : this.venditeS.exportCsv(this.giorni());
    chiamata.subscribe({
      next: blob => {
        this.scaricando.set(false);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vendite-ultimi-${this.giorni()}gg.${formato}`;
        a.click();
        URL.revokeObjectURL(url);
        this.toast(formato === 'xlsx' ? 'Excel scaricato.' : 'CSV scaricato.', false);
      },
      error: () => {
        this.scaricando.set(false);
        this.toast('Download non riuscito', true);
      }
    });
  }

  private toast(testo: string, errore: boolean): void {
    this.messaggio.set({ testo, errore });
    if (isPlatformBrowser(this.platformId))
      setTimeout(() => this.messaggio.set(null), 2800);
  }
}