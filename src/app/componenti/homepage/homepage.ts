import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { AuthServices } from '../../auth/auth-services';
import { MatIconModule } from '@angular/material/icon';
import { inject } from '@angular/core';


@Component({
  selector: 'app-homepage',
  imports: [RouterLink, MatButtonModule,MatIconModule],
  templateUrl: './homepage.html',
  styleUrl: './homepage.css',
})
export class Homepage {

  authS = inject(AuthServices);

  vetrine = [
    { path: 'carte-singole', icona: 'style',           label: 'Carte singole', testo: 'Migliaia di stampe, ogni condizione e lingua.' },
    { path: 'bustine',       icona: 'inventory_2',     label: 'Buste',         testo: 'Buste sigillate delle espansioni recenti.' },
    { path: 'box',           icona: 'all_inbox',       label: 'Box',           testo: 'Display completi per draft e collezione.' },
    { path: 'mazzi',         icona: 'auto_awesome',    label: 'Mazzi',         testo: 'Precostruiti pronti da giocare.' },
  ];

}
