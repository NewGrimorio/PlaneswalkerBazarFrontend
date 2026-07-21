import { MagazzinoSKUDTO } from './magazzino-sku-dto';

export interface ProdottoDTO {
  id: number;
  tipoProdotto: string;
  nome: string;
  slug: string;
  descrizione: string | null;
  imageUrl: string | null;
  attivo: boolean;
  espansioneId: number | null;
  espansioneNome: string | null;

  /**
   * Varianti acquistabili: presenti SOLO nel dettaglio (getBySlug),
   * assenti nelle liste (listByTipo). Per questo sono opzionali.
   */
  skus?: MagazzinoSKUDTO[];
}