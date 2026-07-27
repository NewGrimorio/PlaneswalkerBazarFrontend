import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Converte la notazione Scryfall ({W}, {2/U}, {T}) nei simboli del
 * mana font. Vale sia per il costo di mana sia per il testo oracle,
 * dove compaiono tap, energia e costi ibridi.
 *
 * Il testo viene ESCAPED prima della sostituzione: anche se i dati
 * arrivano da Scryfall e non dall'utente, non si passa mai HTML
 * grezzo a innerHTML senza filtrarlo.
 */
@Pipe({ name: 'simboliMana' })
export class SimboliManaPipe implements PipeTransform {

  private sanitizer = inject(DomSanitizer);

  /** Simboli il cui nome non deriva dalla lettera. */
  private static readonly SPECIALI: Record<string, string> = {
    T: 'tap',
    Q: 'untap',
    '∞': 'infinity',
  };

  transform(testo: string | null | undefined): SafeHtml {
    if (!testo) return '';

    const sicuro = testo
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const html = sicuro.replace(/\{([^}]+)\}/g, (intero, simbolo: string) => {
      const classe = SimboliManaPipe.classeDi(simbolo);
      // Simbolo sconosciuto -> si lascia il testo originale, mai un buco
      return classe
        ? `<i class="ms ms-${classe} ms-cost ms-shadow"></i>`
        : intero;
    });

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  /** {W} -> w ; {2/U} -> 2u ; {W/P} -> wp ; {15} -> 15 ; {T} -> tap */
  private static classeDi(simbolo: string): string | null {
    const s = simbolo.trim().toUpperCase();
    if (SimboliManaPipe.SPECIALI[s]) return SimboliManaPipe.SPECIALI[s];
    const pulito = s.replace(/\//g, '').toLowerCase();
    return /^[0-9a-z]+$/.test(pulito) ? pulito : null;
  }
}