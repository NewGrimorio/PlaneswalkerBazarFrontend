import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Ricerca, RisultatoRicercaDTO } from '../../services/ricerca';
import { urlImmagine } from '../../utils/url-immagine';

/**
 * Barra di ricerca globale (stile Cardtrader): input in topbar,
 * risultati in un menu ancorato. Le CARTE arrivano gia' aggregate
 * dal backend ("N versioni" -> /carta/:slug); i generici vanno a
 * /prodotto/:slug.
 *
 * DEBOUNCE artigianale (250ms di pausa): la chiamata parte quando
 * l'utente smette di digitare, non a ogni tasto. Un contatore di
 * versione scarta le risposte arrivate in ritardo fuori ordine —
 * il classico bug della ricerca live ("bloo" risponde DOPO "bloom"
 * e sovrascrive i risultati giusti con quelli vecchi).
 */
@Component({
  selector: 'app-barra-ricerca',
  imports: [MatIconModule],
  templateUrl: './barra-ricerca.html',
  styleUrl: './barra-ricerca.css',
})
export class BarraRicerca {
  private ricercaS = inject(Ricerca);
  private router = inject(Router);

  protected readonly urlImmagine = urlImmagine;

  query = signal('');
  risultati = signal<RisultatoRicercaDTO[]>([]);
  aperto = signal(false);
  cercando = signal(false);

  private timer: ReturnType<typeof setTimeout> | null = null;
  private versione = 0;

  /** Etichette per il dettaglio dei generici. */
  private readonly ETICHETTE: Record<string, string> = {
    BOOSTER: 'Bustina', BOOSTER_BOX: 'Box', MAZZO: 'Mazzo',
    SET_LOTTO: 'Lotto di carte', SIGILLATO: 'Bundle', ACCESSORIO: 'Accessorio',
  };
  etichetta(r: RisultatoRicercaDTO): string {
    if (r.tipo === 'CARTA') return r.dettaglio ?? 'Carta';
    const tipo = this.ETICHETTE[r.tipo] ?? r.tipo;
    return r.dettaglio ? `${tipo} · ${r.dettaglio}` : tipo;
  }

  onInput(v: string): void {
    this.query.set(v);
    if (this.timer) clearTimeout(this.timer);

    if (v.trim().length < 2) {
      this.risultati.set([]);
      this.aperto.set(false);
      return;
    }
    this.timer = setTimeout(() => this.cerca(v.trim()), 250);
  }

  private cerca(q: string): void {
    const mia = ++this.versione;
    this.cercando.set(true);
    this.ricercaS.cerca(q).subscribe({
      next: r => {
        if (mia !== this.versione) return;   // risposta vecchia: scartata
        this.risultati.set(r);
        this.aperto.set(true);
        this.cercando.set(false);
      },
      error: () => {
        if (mia !== this.versione) return;
        this.risultati.set([]);
        this.cercando.set(false);
      }
    });
  }

  /** Invio: la pagina risultati completa (/ricerca?q=...). */
  invio(): void {
    const q = this.query().trim();
    if (q.length < 2) return;
    this.chiudi();
    this.router.navigate(['/ricerca'], { queryParams: { q } });
  }

  vai(r: RisultatoRicercaDTO): void {
    this.chiudi();
    if (r.tipo !== 'CARTA') {
      this.router.navigate(['/prodotto', r.slug]);
      return;
    }
    // Una sola versione: dritti al dettaglio. Piu' versioni: la
    // pagina che le mostra tutte, cosi' l'utente sceglie la stampa.
    if ((r.versioni ?? 1) > 1)
      this.router.navigate(['/carta', r.slug, 'versioni']);
    else
      this.router.navigate(['/carta', r.slug]);
  }

  chiudi(): void {
    this.aperto.set(false);
    this.query.set('');
    this.risultati.set([]);
  }

  /** blur ritardato: il click su un risultato deve fare in tempo
   *  a scattare prima che il menu sparisca. */
  onBlur(): void {
    setTimeout(() => this.aperto.set(false), 180);
  }
}