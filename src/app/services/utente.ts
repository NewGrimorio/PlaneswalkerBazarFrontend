import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UtenteDTO } from '../modelli/utente-dto';
import { environment } from '../../environments/environment';

const BASE = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class Utente {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/utenti`;

  loginUtente(identificativo: string, password: string): Observable<UtenteDTO> {
  return this.http.post<UtenteDTO>(`${BASE}/utenti/login`, { identificativo, password });
}

  registraUtente(dati: {
    nome: string;
    cognome: string;
    email: string;
    telefono: string;
    dataNascita: string;
    codiceFiscale: string;
    password: string;
  }): Observable<UtenteDTO> {
    return this.http.post<UtenteDTO>(`${this.apiUrl}/registrazione`, dati);
  }

  getById(id: number): Observable<UtenteDTO> {
    return this.http.get<UtenteDTO>(`${BASE}/utenti/${id}`);
  }

  updateProfilo(dati: {
    id: number; nome: string; cognome: string; username: string;
    telefono: string | null; dataNascita: string | null; codiceFiscale: string | null;
  }): Observable<UtenteDTO> {
    return this.http.put<UtenteDTO>(`${BASE}/utenti/profilo`, dati);
  }

  changeEmail(utenteId: number, nuovaEmail: string, password: string): Observable<UtenteDTO> {
    return this.http.put<UtenteDTO>(`${BASE}/utenti/email`,
      { utenteId, nuovaEmail, password });
  }

  changePassword(utenteId: number, vecchiaPassword: string, nuovaPassword: string): Observable<UtenteDTO> {
    return this.http.put<UtenteDTO>(`${BASE}/utenti/password`,
      { utenteId, vecchiaPassword, nuovaPassword });
  }
  
}