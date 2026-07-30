import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { VendutoTopDTO } from '../modelli/venduto-top-dto';

const BASE = environment.apiUrl;

/**
 * Classifica venduti ed export. Il CSV si scarica come BLOB e non con
 * un <a href> diretto: l'access token vive in memoria e viaggia solo
 * nell'interceptor — un link nudo arriverebbe al server senza Bearer.
 */
@Injectable({ providedIn: 'root' })
export class Vendite {
  private http = inject(HttpClient);

  /** Classifica PUBBLICA (homepage): quantita' senza ricavi. */
  top(giorni = 7, limite = 6): Observable<VendutoTopDTO[]> {
    return this.http.get<VendutoTopDTO[]>(`${BASE}/public/vendite/top`,
        { params: { giorni, limite } });
  }

  /** Classifica ADMIN: con i ricavi. */
  topAdmin(giorni = 7, limite = 10): Observable<VendutoTopDTO[]> {
    return this.http.get<VendutoTopDTO[]>(`${BASE}/admin/vendite/top`,
        { params: { giorni, limite } });
  }

  /** Il CSV grezzo (una riga per voce d'ordine), come blob. */
  exportCsv(giorni = 30): Observable<Blob> {
    return this.http.get(`${BASE}/admin/vendite/export.csv`,
        { params: { giorni }, responseType: 'blob' });
  }

  /** Excel vero (.xlsx, POI): celle tipizzate, stesso schema del CSV. */
  exportXlsx(giorni = 30): Observable<Blob> {
    return this.http.get(`${BASE}/admin/vendite/export.xlsx`,
        { params: { giorni }, responseType: 'blob' });
  }
}