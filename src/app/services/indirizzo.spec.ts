import { TestBed } from '@angular/core/testing';

import { Indirizzo } from './indirizzo';

describe('Indirizzo', () => {
  let service: Indirizzo;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Indirizzo);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
