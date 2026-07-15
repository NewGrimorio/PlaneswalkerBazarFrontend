import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EspansioneDTO } from '../../modelli/espansione-dto';
import { SincronizzazioneDTO } from '../../modelli/sincronizzazione-dto';
import { environment } from '../../../environments/environment';

const BASE = environment.apiUrl;

type TipoMessaggio = 'ok' | 'avviso' | 'errore';


@Component({
  selector: 'app-sync-scryfall',
  imports: [FormsModule, DatePipe, MatButtonModule, MatFormFieldModule,
            MatInputModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './sync-scryfall.html',
  styleUrl: './sync-scryfall.css',
})

export class SyncScryfall {

  private http = inject(HttpClient);

  espansioni = signal<EspansioneDTO[]>([]);
  codice = '';
  inCorso = signal<string | null>(null);
  messaggio = signal<{ testo: string; tipo: TipoMessaggio } | null>(null);

  constructor() {
    this.carica();
  }

  private carica(): void {
    this.http.get<EspansioneDTO[]>(`${BASE}/espansioni`)
      .subscribe({
        next: lista => this.espansioni.set(lista),
        error: err => this.mostraErrore(err)
      });
  }

  sincronizza(codice: string): void {
    const cod = codice.trim().toLowerCase();
    if (!cod || this.inCorso() !== null) return;

    this.messaggio.set(null);
    this.inCorso.set(cod);

    // Path variable, nessun body: POST /api/admin/sync/mh3
    this.http.post<SincronizzazioneDTO>(
        `${BASE}/admin/sync/${encodeURIComponent(cod)}`, null)
      .subscribe({
        next: report => {
          const sec = (report.durataMs / 1000).toFixed(1);
          const orfane = report.stampeOrfane > 0
            ? ` — ${report.stampeOrfane} stampe orfane da rivedere`
            : '';
          this.messaggio.set({
            testo: `«${report.nomeSet}» sincronizzata in ${sec}s: `
                 + `${report.stampeNuove} nuove, ${report.stampeAggiornate} aggiornate`
                 + orfane,
            tipo: report.stampeOrfane > 0 ? 'avviso' : 'ok'
          });
          this.codice = '';
          this.inCorso.set(null);
          this.carica();   // il report non porta la riga: si ricarica la lista
        },
        error: err => {
          this.mostraErrore(err);
          this.inCorso.set(null);
        }
      });
  }

  private mostraErrore(err: any): void {
    this.messaggio.set({
      testo: err.error?.msg ?? 'Errore di comunicazione col server',
      tipo: 'errore'
    });
  }


}
