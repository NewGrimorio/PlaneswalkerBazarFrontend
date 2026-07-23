import { Routes } from '@angular/router';
import { Homepage } from './componenti/homepage/homepage';
import { Login } from './componenti/login/login';
import { Dashboard } from './componenti/admin/dashboard/dashboard';
import { adminGuard } from './auth/admin-guard';
import { autentificateGuard } from './auth/autentificate-guard';
import { AdminLayout } from './componenti/admin-layout/admin-layout';
import { SyncScryfall } from './componenti/admin/sync-scryfall/sync-scryfall';
import { Prodotti } from './componenti/admin/prodotti/prodotti';
import { Magazzino } from './componenti/admin/magazzino/magazzino';
import { Registrazione } from './componenti/registrazione/registrazione';
import { Account } from './componenti/admin/account/account';
import { Negozio } from './componenti/negozio/negozio';
import { Checkout } from './componenti/checkout/checkout';
import { Ordini } from './componenti/admin/ordini/ordini';
import { Movimenti } from './componenti/admin/movimenti/movimenti';
import { Recensioni } from './componenti/admin/recensioni/recensioni';
import { UserLayout } from './componenti/user-layout/user-layout';

export const routes: Routes = [

    // Pagine a tutto schermo: fuori dalla shell, niente nav.
    // Dichiarate PRIMA del blocco a path vuoto per leggibilita':
    // l'ordine conta, Angular si ferma alla prima rotta che combacia.
    { path: 'login',         component: Login },
    { path: 'registrazione', component: Registrazione },

    // Vecchio percorso: qualcuno potrebbe averlo nei preferiti
    { path: 'negozio', redirectTo: 'carte-singole', pathMatch: 'full' },

    // ------------------------------------------------------------------
    // AREA PUBBLICA + CLIENTE
    // La nav e' sempre presente e il catalogo si sfoglia da ospiti:
    // il login serve solo per comprare. Cosi' l'SSR renderizza davvero
    // la vetrina (indicizzabile), non un guscio vuoto.
    // ------------------------------------------------------------------
    {
        path: '',
        component: UserLayout,
        children: [
            { path: '',              component: Homepage },
            { path: 'carte-singole', component: Negozio, data: { tipo: 'SINGLE' } },
            { path: 'bustine',       component: Negozio, data: { tipo: 'BOOSTER' } },
            { path: 'box',           component: Negozio, data: { tipo: 'BOOSTER_BOX' } },
            { path: 'mazzi',         component: Negozio, data: { tipo: 'MAZZO' } },
            { path: 'lotti',         component: Negozio, data: { tipo: 'SET_LOTTO' } },
            { path: 'sigillato',     component: Negozio, data: { tipo: 'SIGILLATO' } },
            { path: 'accessori',     component: Negozio, data: { tipo: 'ACCESSORIO' } },

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