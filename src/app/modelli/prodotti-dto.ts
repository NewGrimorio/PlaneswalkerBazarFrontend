import { MagazzinoSKUDTO } from './magazzino-sku-dto';
import { StampaDTO } from './stampa-dto';
import { CartaDTO } from './carta-dto';

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
  stampaId: number | null;

  /**
   * Varianti acquistabili: presenti SOLO nel dettaglio (getBySlug),
   * assenti nelle liste (listByTipo). Per questo sono opzionali.
   */
  skus?: MagazzinoSKUDTO[];
  stampa?: StampaDTO;
  carta?: CartaDTO;
  
}