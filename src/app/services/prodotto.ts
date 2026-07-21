import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ProdottoDTO } from '../modelli/prodotti-dto';

const BASE = environment.apiUrl;

/**
 * Catalogo PUBBLICO: nessun token, solo prodotti attivi.
 * Vive sotto /api/public, quindi funziona anche in SSR (nessuna
 * sessione richiesta). NB: listByTipo torna i prodotti SENZA varianti;
 * per gli skus serve il dettaglio getBySlug.
 */
@Injectable({ providedIn: 'root' })
export class Prodotto {
  private http = inject(HttpClient);

  listByTipo(tipo: string): Observable<ProdottoDTO[]> {
    return this.http.get<ProdottoDTO[]>(`${BASE}/public/prodotti/tipo/${tipo}`);
  }

  /** Dettaglio con varianti (skus) e, per i SINGLE, stampa/carta. */
  getBySlug(slug: string): Observable<ProdottoDTO> {
    return this.http.get<ProdottoDTO>(`${BASE}/public/prodotti/${slug}`);
  }

  search(q: string): Observable<ProdottoDTO[]> {
    return this.http.get<ProdottoDTO[]>(`${BASE}/public/prodotti/search`, { params: { q } });
  }
}