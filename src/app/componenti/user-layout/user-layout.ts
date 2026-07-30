import { Component, effect, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DecimalPipe } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthServices } from '../../auth/auth-services';
import { Utente } from '../../services/utente';
import { Portafoglio } from '../../services/portafoglio';
import { Carrello } from '../../services/carrello';
import { urlImmagine } from '../../utils/url-immagine';
import { BarraRicerca } from '../barra-ricerca/barra-ricerca';

/**
 * Shell dell'area cliente: nav orizzontale + outlet.
 * Speculare ad AdminLayout, ma il CSS resta locale al componente
 * (view encapsulation): non serve un foglio globale come admin.css.
 *
 * CHIP UTENTE (via di mezzo Amazon/Cardtrader): avatar vero nel
 * cerchietto, "Ciao, username" e il SALDO del portafoglio sempre
 * visibile — su un sito col credito interno e' l'informazione che
 * l'utente cerca piu' spesso. Il saldo arriva dal signal condiviso
 * del service e si rinfresca all'apertura del menu: copre anche gli
 * acquisti appena fatti senza dover cablare ogni pagina.
 */
@Component({
  selector: 'app-user-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, DecimalPipe,
            MatIconModule, MatMenuModule, BarraRicerca],
  templateUrl: './user-layout.html',
  styleUrl: './user-layout.css',
})
export class UserLayout {
  private router = inject(Router);
  private utenteS = inject(Utente);
  private platformId = inject(PLATFORM_ID);
  authS = inject(AuthServices);
  portafoglioS = inject(Portafoglio);
  carrelloS = inject(Carrello);

  /** Esposta al template: le funzioni importate non sono visibili da sole */
  protected readonly urlImmagine = urlImmagine;

  categorie = [
    { path: 'carte-singole', label: 'Carte singole' },
    { path: 'bustine',       label: 'Bustine' },
    { path: 'box',           label: 'Box' },
    { path: 'mazzi',         label: 'Mazzi' },
    // Path INVARIATI (URL stabili, agganciati a route.data e tipo
    // prodotto): cambiano solo le parole che il cliente legge.
    { path: 'lotti',         label: 'Lotti di carte' },
    { path: 'sigillato',     label: 'Bundle' },
    { path: 'accessori',     label: 'Accessori' },
  ];

  constructor() {
    // Saldo e CARRELLO seguono la sessione: appena c'e' un utente
    // (login, refresh silenzioso, hydration) si caricano; via
    // l'utente, via entrambi. Solo browser: in SSR niente sessione.
    effect(() => {
      const u = this.authS.utente();
      if (!isPlatformBrowser(this.platformId)) return;
      if (u) { this.portafoglioS.refreshSaldo(); this.carrelloS.refresh(); }
      else   { this.portafoglioS.azzeraSaldo();  this.carrelloS.azzera(); }
    });
  }

  /** E' un admin? Mostra la scorciatoia per la plancia nel menu. */
  get eAdmin(): boolean {
    return this.authS.utente()?.ruolo === 'ADMIN';
  }

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
    this.portafoglioS.azzeraSaldo();
    this.carrelloS.azzera();
    this.authS.resetAll();
    this.router.navigate(['/login']);
  }
  
}