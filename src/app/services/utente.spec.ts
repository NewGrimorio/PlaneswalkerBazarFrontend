import { TestBed } from '@angular/core/testing';

import { Utente } from './utente';

describe('Utente', () => {
  let service: Utente;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Utente);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
