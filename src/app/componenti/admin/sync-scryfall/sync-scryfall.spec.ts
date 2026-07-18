import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SyncScryfall } from './sync-scryfall';

describe('SyncScryfall', () => {
  let component: SyncScryfall;
  let fixture: ComponentFixture<SyncScryfall>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SyncScryfall],
    }).compileComponents();

    fixture = TestBed.createComponent(SyncScryfall);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
