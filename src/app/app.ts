import { Component, inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { JsonPipe } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { environment } from '../environments/environment';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, JsonPipe,MatButtonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {

  private http = inject(HttpClient);

  risposta: unknown;          // il JSON del backend, se arriva
  errore: string | null = null;

  ngOnInit(): void {
    this.http.get(`${environment.apiUrl}/espansioni`).subscribe({
      next: (dati) => this.risposta = dati,
      error: (err) => this.errore = `Errore ${err.status}: ${err.message}`
    });
  }
  
}