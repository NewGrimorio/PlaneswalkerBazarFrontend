import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

const BASE = environment.apiUrl;

/** Una riga del menu di ricerca (schema unico carta/prodotto). */
export interface RisultatoRicercaDTO {
  tipo: string;        // 'CARTA' oppure il tipo prodotto (BOOSTER_BOX, ...)
  nome: string;
  dettaglio: string | null;
  slug: string;
  imageUrl: string | null;
}

/** Ricerca globale: endpoint pubblico, niente token necessario. */
@Injectable({ providedIn: 'root' })
export class Ricerca {
  private http = inject(HttpClient);

  cerca(q: string, limite = 6): Observable<RisultatoRicercaDTO[]> {
    return this.http.get<RisultatoRicercaDTO[]>(`${BASE}/public/ricerca`,
        { params: { q, limite } });
  }
}