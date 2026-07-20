import { environment } from '../../environments/environment';

/** Scryfall/esterni = URL assoluto; upload locale = relativo da prefissare col backend */
export function urlImmagine(percorso: string | null | undefined): string | null {
  if (!percorso) return null;
  return percorso.startsWith('http') ? percorso : environment.serverUrl + percorso;
}