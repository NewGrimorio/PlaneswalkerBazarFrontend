import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Magazzino } from './magazzino';

describe('Magazzino', () => {
  let component: Magazzino;
  let fixture: ComponentFixture<Magazzino>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Magazzino],
    }).compileComponents();

    fixture = TestBed.createComponent(Magazzino);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
