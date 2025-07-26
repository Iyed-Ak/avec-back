import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InscriptionsMapComponent } from './inscriptions-map.component';

describe('InscriptionsMapComponent', () => {
  let component: InscriptionsMapComponent;
  let fixture: ComponentFixture<InscriptionsMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InscriptionsMapComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InscriptionsMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
