import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AcceuilComponent } from './acceuil.component';
import { NosFormationsComponent } from './nos-services/nos-services.component';

describe('AcceuilComponent', () => {
  let component: AcceuilComponent;
  let fixture: ComponentFixture<AcceuilComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AcceuilComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AcceuilComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
