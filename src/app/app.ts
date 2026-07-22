import { Component, inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { JsonPipe } from '@angular/common';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { environment } from '../environments/environment';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MatButtonModule, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {

  private http = inject(HttpClient);
  private router = inject(Router);
  
  risposta: unknown;          // il JSON del backend, se arriva
  errore: string | null = null;

  ngOnInit(): void {
    this.http.get(`${environment.apiUrl}/public/espansioni`).subscribe({
      next: (dati) => this.risposta = dati,
      error: (err) => this.errore = `Errore ${err.status}: ${err.message}`
    });
  }

  mostraBarra(): boolean {
  return !this.router.url.startsWith('/admin')
      && !this.router.url.startsWith('/user');
}
  
}