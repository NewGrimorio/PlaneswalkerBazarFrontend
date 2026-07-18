import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { IndirizzoDTO } from '../modelli/indirizzo-dto';

const BASE = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class Indirizzo {
  private http = inject(HttpClient);

  list(utenteId: number): Observable<IndirizzoDTO[]> {
    return this.http.get<IndirizzoDTO[]>(`${BASE}/indirizzi`, { params: { utenteId } });
  }

  create(corpo: any): Observable<IndirizzoDTO> {
    return this.http.post<IndirizzoDTO>(`${BASE}/indirizzi`, corpo);
  }

  update(corpo: any): Observable<IndirizzoDTO> {
    return this.http.put<IndirizzoDTO>(`${BASE}/indirizzi`, corpo);
  }

  remove(id: number, utenteId: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/indirizzi/${id}`, { params: { utenteId } });
  }

  setPredefinito(id: number, utenteId: number): Observable<void> {
    return this.http.post<void>(`${BASE}/indirizzi/${id}/set-predefinito`, null,
      { params: { utenteId } });
  }
}