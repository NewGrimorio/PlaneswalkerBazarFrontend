import { Routes } from '@angular/router';
import { Homepage } from './componenti/homepage/homepage';
import { Login } from './componenti/login/login';
import { Dashboard } from './componenti/admin/dashboard/dashboard';
import { adminGuard } from './auth/admin-guard';
import { AdminLayout } from './componenti/admin-layout/admin-layout';
import { SyncScryfall } from './componenti/admin/sync-scryfall/sync-scryfall';
import { Prodotti } from './componenti/admin/prodotti/prodotti';
import { Magazzino } from './componenti/admin/magazzino/magazzino';
import { Registrazione } from './componenti/registrazione/registrazione';
import { Account } from './componenti/admin/account/account';
import { UserLayout } from './componenti/user-layout/user-layout';

export const routes: Routes = [
  { path: '', component: Homepage },
  { path: 'login', component: Login },
  { path: 'registrazione', component: Registrazione },

  {
    path: 'admin',
    component: AdminLayout,
    canActivate: [adminGuard],
    canActivateChild: [adminGuard],
    children: [
      { path: '', component: Dashboard },
      { path: 'sync', component: SyncScryfall },
      { path: 'prodotti', component: Prodotti },
      { path: 'magazzino', component: Magazzino },
      { path: 'account', component: Account }
    ]
  },

  {
    path: 'user',
    component: UserLayout,
    children: [
      { path: 'account', component: Account }
    ]
  },

  { path: '**', redirectTo: '' }
];