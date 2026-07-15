import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UtenteDTO } from '../modelli/utente-dto';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class Utente {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/utenti`;

  loginUtente(email: string, password: string): Observable<UtenteDTO> {
    return this.http.post<UtenteDTO>(`${this.apiUrl}/login`, { email, password });
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
  
}