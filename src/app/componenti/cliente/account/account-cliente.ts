import { Component, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthServices } from '../../../auth/auth-services'
import { Portafoglio } from '../../../services/portafoglio';

/** Una tessera dell'hub. 'pronta' e' impalcatura temporanea: le sezioni
 *  si costruiscono una alla volta, e finche' una pagina non esiste la
 *  tessera si vede ma non naviga (chip "In arrivo"). */
interface Sezione {
  link: string;
  icona: string;
  titolo: string;
  descrizione: string;
  pronta: boolean;
  mostraSaldo?: boolean;
}

/**
 * Hub dell'area cliente, sul modello della pagina Account di Cardtrader:
 * tessere che portano alle sezioni, sull'illustrazione del planeswalker
 * in cammino verso il bazar. Vive DENTRO UserLayout (la nav resta).
 *
 * Rotta protetta da autentificateGuard; il saldo si carica solo nel
 * browser (in SSR il guard si astiene e il client completa).
 */
@Component({
  selector: 'app-account-cliente',
  imports: [RouterLink, MatIconModule, DecimalPipe],
  templateUrl: './account-cliente.html',
  styleUrl: './account-cliente.css',
})
export class AccountCliente {
  authS = inject(AuthServices);
  private portafoglioS = inject(Portafoglio);
  private platformId = inject(PLATFORM_ID);

  saldo = signal<number | null>(null);

  sezioni: Sezione[] = [
    { link: '/account/profilo',     icona: 'person',
      titolo: 'Informazioni personali',
      descrizione: 'Nome, email, username, avatar e password.',
      pronta: false },
    { link: '/account/portafoglio', icona: 'account_balance_wallet',
      titolo: 'Portafoglio',
      descrizione: 'Ricariche, prelievi e storico dei movimenti.',
      pronta: true, mostraSaldo: true },
    { link: '/account/ordini',      icona: 'local_shipping',
      titolo: 'I miei ordini',
      descrizione: 'Stato delle spedizioni, annullamenti e resi.',
      pronta: true },
    { link: '/account/indirizzi',   icona: 'location_on',
      titolo: 'Indirizzi',
      descrizione: 'Gli indirizzi di spedizione e il predefinito.',
      pronta: true },
    { link: '/account/conti',       icona: 'account_balance',
      titolo: 'Conti bancari',
      descrizione: 'I conti per i prelievi dal portafoglio.',
      pronta: true },
    { link: '/account/recensioni',  icona: 'rate_review',
      titolo: 'Le mie recensioni',
      descrizione: 'Le recensioni che hai scritto sui prodotti.',
      pronta: true },
  ];

  constructor() {
    if (isPlatformBrowser(this.platformId))
      this.portafoglioS.get().subscribe({
        next: p => this.saldo.set(p.saldo),
        error: () => {}
      });
  }
}