import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { IndirizzoDTO } from '../modelli/indirizzo-dto';

const BASE = environment.apiUrl;

/**
 * FASE C: l'utenteId e' SPARITO da params e body. L'identita' viaggia
 * nel Bearer token (interceptor) e la mette il backend: da qui non e'
 * piu' possibile, nemmeno per errore, toccare la rubrica di un altro.
 */
@Injectable({ providedIn: 'root' })
export class Indirizzo {
  private http = inject(HttpClient);

  list(): Observable<IndirizzoDTO[]> {
    return this.http.get<IndirizzoDTO[]>(`${BASE}/indirizzi`);
  }

  create(corpo: any): Observable<IndirizzoDTO> {
    return this.http.post<IndirizzoDTO>(`${BASE}/indirizzi`, corpo);
  }

  update(corpo: any): Observable<IndirizzoDTO> {
    return this.http.put<IndirizzoDTO>(`${BASE}/indirizzi`, corpo);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/indirizzi/${id}`);
  }

  setPredefinito(id: number): Observable<void> {
    return this.http.post<void>(`${BASE}/indirizzi/${id}/set-predefinito`, null);
  }
}