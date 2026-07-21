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

export const routes: Routes = [
    { path: '', component: Homepage },
    { path: 'login', component: Login },

    // Pagine temporanee del cliente
    { path: 'negozio',  component: Negozio,  canActivate: [autentificateGuard] },
    { path: 'checkout', component: Checkout, canActivate: [autentificateGuard] },

    {
        path: 'admin',
        component: AdminLayout,
        canActivate: [adminGuard],
        canActivateChild: [adminGuard],
        children: [
            { path: '',     component: Dashboard },
            { path: 'sync', component: SyncScryfall },
            { path: 'prodotti', component: Prodotti },
            { path: 'magazzino', component: Magazzino },
            { path: 'ordini', component: Ordini },
            { path: 'movimenti', component: Movimenti },
            { path: 'recensioni', component: Recensioni },
            { path: 'account', component: Account },
        ]
    },
    { path: 'registrazione', component: Registrazione },
    { path: '**', redirectTo: '' }
];