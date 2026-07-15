import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Prodotti } from './prodotti';

describe('Prodotti', () => {
  let component: Prodotti;
  let fixture: ComponentFixture<Prodotti>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Prodotti],
    }).compileComponents();

    fixture = TestBed.createComponent(Prodotti);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
