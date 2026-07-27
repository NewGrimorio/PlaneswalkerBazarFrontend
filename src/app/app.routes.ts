import { Routes } from '@angular/router';
import { Homepage } from './componenti/homepage/homepage';
import { Login } from './componenti/login/login';
import { Registrazione } from './componenti/registrazione/registrazione';
import { UserLayout } from './componenti/user-layout/user-layout';
import { Espansioni } from './componenti/espansioni/espansioni';
import { Negozio } from './componenti/negozio/negozio';
import { CartaDettaglio } from './componenti/carta-dettaglio/carta-dettaglio';
import { Checkout } from './componenti/cliente/checkout/checkout';
import { AdminLayout } from './componenti/admin-layout/admin-layout';
import { Dashboard } from './componenti/admin/dashboard/dashboard';
import { SyncScryfall } from './componenti/admin/sync-scryfall/sync-scryfall';
import { Prodotti } from './componenti/admin/prodotti/prodotti';
import { Magazzino } from './componenti/admin/magazzino/magazzino';
import { Ordini } from './componenti/admin/ordini/ordini';
import { Movimenti } from './componenti/admin/movimenti/movimenti';
import { Recensioni } from './componenti/admin/recensioni/recensioni';
import { Account } from './componenti/admin/account/account';
import { adminGuard } from './auth/admin-guard';
import { autentificateGuard } from './auth/autentificate-guard';
import { AccountCliente } from './componenti/cliente/account/account-cliente';
import { OrdiniCliente } from './componenti/cliente/ordini/ordini';

export const routes: Routes = [

    // Pagine a tutto schermo: fuori dalla shell, niente nav.
    { path: 'login',         component: Login },
    { path: 'registrazione', component: Registrazione },

    // Vecchio percorso: qualcuno potrebbe averlo nei preferiti
    { path: 'negozio', redirectTo: 'carte-singole', pathMatch: 'full' },

    // ------------------------------------------------------------------
    // AREA PUBBLICA + CLIENTE
    // Catalogo sfogliabile da ospiti: il login serve solo per comprare.
    // Cosi' l'SSR renderizza davvero la vetrina, non un guscio vuoto.
    // ------------------------------------------------------------------
    {
        path: '',
        component: UserLayout,
        children: [
            { path: '', component: Homepage },

            { path: 'account', component: AccountCliente, canActivate: [autentificateGuard] },
            { path: 'account/ordini', component: OrdiniCliente, canActivate: [autentificateGuard] },

            // Carte singole: due passi — griglia set, poi carte del set
            { path: 'carte-singole',         component: Espansioni },
            { path: 'carte-singole/:codice', component: Negozio, data: { tipo: 'SINGLE' } },

            // Pagina carta (stile Scryfall): pubblica, indicizzabile
            { path: 'carta/:slug', component: CartaDettaglio },

            // Altre categorie: un passo solo
            { path: 'bustine',   component: Negozio, data: { tipo: 'BOOSTER' } },
            { path: 'box',       component: Negozio, data: { tipo: 'BOOSTER_BOX' } },
            { path: 'mazzi',     component: Negozio, data: { tipo: 'MAZZO' } },
            { path: 'lotti',     component: Negozio, data: { tipo: 'SET_LOTTO' } },
            { path: 'sigillato', component: Negozio, data: { tipo: 'SIGILLATO' } },
            { path: 'accessori', component: Negozio, data: { tipo: 'ACCESSORIO' } },

            // L'unica pagina protetta dell'area cliente: qui si paga.
            { path: 'checkout', component: Checkout, canActivate: [autentificateGuard] },
        ],
    },

    // ------------------------------------------------------------------
    // AREA ADMIN — shell propria, tutto sotto ROLE_ADMIN
    // ------------------------------------------------------------------
    {
        path: 'admin',
        component: AdminLayout,
        canActivate: [adminGuard],
        canActivateChild: [adminGuard],
        children: [
            { path: '',           component: Dashboard },
            { path: 'sync',       component: SyncScryfall },
            { path: 'prodotti',   component: Prodotti },
            { path: 'magazzino',  component: Magazzino },
            { path: 'ordini',     component: Ordini },
            { path: 'movimenti',  component: Movimenti },
            { path: 'recensioni', component: Recensioni },
            { path: 'account',    component: Account },
        ]
    },

    { path: '**', redirectTo: '' }
];