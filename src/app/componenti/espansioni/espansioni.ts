import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { EspansioneDTO } from '../../modelli/espansione-dto';
import { environment } from '../../../environments/environment';

const BASE = environment.apiUrl;

/**
 * Griglia dei set: primo passo della navigazione delle carte singole.
 * Le espansioni sono PUBBLICHE, quindi caricano anche in SSR — la
 * pagina e' indicizzabile e ogni set ha il suo URL (/carte-singole/mh3).
 *
 * iconUrl e' il simbolo del set fornito da Scryfall: un SVG monocromatico
 * NERO, quindi in CSS va invertito per leggersi sul fondo scuro.
 */
@Component({
  selector: 'app-espansioni',
  imports: [RouterLink, DatePipe, MatIconModule],
  templateUrl: './espansioni.html',
  styleUrl: './espansioni.css',
})
export class Espansioni {
  private http = inject(HttpClient);

  espansioni = signal<EspansioneDTO[]>([]);
  caricando = signal(true);

  constructor() {
    this.http.get<EspansioneDTO[]>(`${BASE}/public/espansioni`)
      .subscribe({
        next: l => { this.espansioni.set(l); this.caricando.set(false); },
        error: () => { this.espansioni.set([]); this.caricando.set(false); }
      });
  }
}