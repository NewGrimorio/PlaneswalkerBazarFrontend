import { Component, computed, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Vendite } from '../../services/vendite';
import { VendutoTopDTO } from '../../modelli/venduto-top-dto';
import { urlImmagine } from '../../utils/url-immagine';

/**
 * "I piu' acquistati della settimana" per la homepage, stile
 * MTGStocks: podio con le immagini per i primi tre, righe con barre
 * proporzionali per gli altri. Il "grafico" e' CSS puro — per una
 * top-6 una libreria di chart sarebbe un cannone per una mosca.
 *
 * Autosufficiente: si carica da solo (browser-only) e se la finestra
 * non ha vendite si NASCONDE, senza lasciare un buco in homepage.
 * Solo quantita': i ricavi non escono dall'area admin.
 */
@Component({
  selector: 'app-top-venduti',
  imports: [MatIconModule, RouterLink],
  templateUrl: './top-venduti.html',
  styleUrl: './top-venduti.css',
})
export class TopVenduti {
  private venditeS = inject(Vendite);
  private platformId = inject(PLATFORM_ID);

  classifica = signal<VendutoTopDTO[]>([]);
  caricando = signal(true);

  podio = computed(() => this.classifica().slice(0, 3));
  resto = computed(() => this.classifica().slice(3));

  /** Le barre sono proporzionali al primo classificato. */
  massimo = computed(() => this.classifica()[0]?.quantita ?? 1);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.venditeS.top(7, 6).subscribe({
        next: l => { this.classifica.set(l); this.caricando.set(false); },
        error: () => { this.classifica.set([]); this.caricando.set(false); }
      });
    } else {
      this.caricando.set(false);
    }
  }

  larghezza(t: VendutoTopDTO): string {
    return Math.max(6, Math.round(t.quantita / this.massimo() * 100)) + '%';
  }

  img(t: VendutoTopDTO): string | null {
    return t.imageUrl ? urlImmagine(t.imageUrl) : null;
  }

  /** Solo le CARTE hanno una pagina di dettaglio (/carta/:slug);
   *  per i sigillati la classifica resta informativa, senza link. */
  link(t: VendutoTopDTO): string | null {
    return t.tipo === 'CARTA' && t.slug ? '/carta/' + t.slug : null;
  }
}