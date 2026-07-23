export interface TendenzaSkuDTO {
  skuId: number;
  condizione: string;
  lingua: string;
  finitura: string;
  ctLowest: number | null;
  ctMarket: number | null;
  ctPrecedente: number | null;
  cardmarket: number | null;
  cardmarketPrecedente: number | null;
  valuta: string;
}

export interface TendenzaPrezzoCartaDTO {
  stampaId: number;
  nomeCarta: string;
  codiceSet: string;
  righe: TendenzaSkuDTO[];
  millisecondiImpiegati: number;
}