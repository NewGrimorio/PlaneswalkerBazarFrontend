import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { ProdottoDTO } from '../../modelli/prodotti-dto';
import { EspansioneDTO } from '../../modelli/espansione-dto';
import { environment } from '../../../environments/environment';

const BASE = environment.apiUrl;
const HOST = environment.serverUrl;

/** I tipi creabili a mano: SINGLE nasce solo dal sync (vincolo backend) */
const TIPI = [
  { valore: 'BOOSTER',     etichetta: 'Buste' },
  { valore: 'BOOSTER_BOX', etichetta: 'Box' },
  { valore: 'MAZZO',       etichetta: 'Mazzi' },
  { valore: 'SET_LOTTO',   etichetta: 'Lotti' },
  { valore: 'SIGILLATO',   etichetta: 'Sigillato' },
  { valore: 'ACCESSORIO',  etichetta: 'Accessori' },
] as const;

@Component({
  selector: 'app-prodotti',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule,
            MatInputModule, MatSelectModule, MatIconModule],
  templateUrl: './prodotti.html',
  styleUrl: './prodotti.css',
})
export class Prodotti {

  private http = inject(HttpClient);

  tipi = TIPI;
  tipoAttivo = signal<string>('BOOSTER');
  prodotti = signal<ProdottoDTO[]>([]);
  espansioni = signal<EspansioneDTO[]>([]);

  /** null = form chiuso; 0 = nuovo prodotto; >0 = id in modifica */
  formAperto = signal<number | null>(null);
  messaggio = signal<{ testo: string; errore: boolean } | null>(null);
  inCorso = signal(false);
  caricamentoImmagine = signal(false);
  anteprima = signal<string | null>(null);

  // Campi del form
  fTipo = 'BOOSTER';
  fNome = '';
  fSlug = '';
  fDescrizione = '';
  fEspansioneId: number | null = null;
  fImageUrl = '';

  constructor() {
    this.cambiaTab(this.tipoAttivo());
    this.http.get<EspansioneDTO[]>(`${BASE}/espansioni`)
      .subscribe({ next: l => this.espansioni.set(l), error: () => {} });
  }

  cambiaTab(tipo: string): void {
    this.tipoAttivo.set(tipo);
    this.chiudiForm();
    this.http.get<ProdottoDTO[]>(`${BASE}/admin/catalogo/prodotti/tipo/${tipo}`)
      .subscribe({
        next: lista => this.prodotti.set(lista),
        error: err => this.mostraErrore(err)
      });
  }

  nuovoProdotto(): void {
    this.fTipo = this.tipoAttivo();
    this.fNome = this.fSlug = this.fDescrizione = this.fImageUrl = '';
    this.fEspansioneId = null;
    this.anteprima.set(null);
    this.formAperto.set(0);
  }

  modifica(p: ProdottoDTO): void {
    this.fTipo = p.tipoProdotto;
    this.fNome = p.nome;
    this.fSlug = p.slug;
    this.fDescrizione = p.descrizione ?? '';
    this.fEspansioneId = p.espansioneId;
    this.fImageUrl = p.imageUrl ?? '';
    this.anteprima.set(this.urlImmagine(p.imageUrl));
    this.formAperto.set(p.id);
  }

  chiudiForm(): void {
    this.formAperto.set(null);
    this.anteprima.set(null);
    this.messaggio.set(null);
  }

  /** Upload immediato: il backend risponde col percorso relativo */
  caricaImmagine(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const form = new FormData();
    form.append('file', file);
    this.caricamentoImmagine.set(true);

    this.http.post<{ url: string }>(
        `${BASE}/admin/catalogo/prodotti/immagine`, form)
      .subscribe({
        next: r => {
          this.fImageUrl = r.url;
          this.anteprima.set(this.urlImmagine(r.url));
          this.caricamentoImmagine.set(false);
        },
        error: err => {
          this.mostraErrore(err);
          this.caricamentoImmagine.set(false);
        }
      });
    input.value = '';   // permette di ricaricare lo stesso file
  }

  /** Scryfall = URL assoluto; upload locale = relativo da prefissare */
  urlImmagine(percorso: string | null): string | null {
    if (!percorso) return null;
    return percorso.startsWith('http') ? percorso : HOST + percorso;
  }

  salva(): void {
    const idInModifica = this.formAperto();
    if (idInModifica === null || this.inCorso()) return;
    this.inCorso.set(true);
    this.messaggio.set(null);

    // "" -> null: slug vuoto deve arrivare null per la generazione automatica
    const corpo: any = {
      nome: this.fNome.trim(),
      slug: this.fSlug.trim() || null,
      descrizione: this.fDescrizione.trim() || null,
      espansioneId: this.fEspansioneId,
      imageUrl: this.fImageUrl.trim() || null,
    };

    const chiamata = idInModifica === 0
      ? this.http.post<ProdottoDTO>(`${BASE}/admin/catalogo/prodotti`,
          { ...corpo, tipoProdotto: this.fTipo })
      : this.http.put<ProdottoDTO>(`${BASE}/admin/catalogo/prodotti`,
          { ...corpo, id: idInModifica });

    chiamata.subscribe({
      next: p => {
        this.messaggio.set({
          testo: `«${p.nome}» ${idInModifica === 0 ? 'creato' : 'aggiornato'} (slug: ${p.slug})`,
          errore: false
        });
        this.chiudiForm();
        this.inCorso.set(false);
        this.ricarica();
      },
      error: err => { this.mostraErrore(err); this.inCorso.set(false); }
    });
  }

  /** Patch minimale: l'update backend non tocca i campi null */
  toggleAttivo(p: ProdottoDTO): void {
    this.http.put<ProdottoDTO>(`${BASE}/admin/catalogo/prodotti`,
        { id: p.id, attivo: !p.attivo })
      .subscribe({
        next: agg => this.prodotti.update(lista =>
          lista.map(x => x.id === agg.id ? agg : x)),
        error: err => this.mostraErrore(err)
      });
  }

   private ricarica(): void {
    this.http.get<ProdottoDTO[]>(`${BASE}/admin/catalogo/prodotti/tipo/${this.tipoAttivo()}`)
      .subscribe({ next: lista => this.prodotti.set(lista), error: () => {} });
  }

  private mostraErrore(err: any): void {
    this.messaggio.set({
      testo: err.error?.msg ?? 'Errore di comunicazione col server',
      errore: true
    });
  }

}