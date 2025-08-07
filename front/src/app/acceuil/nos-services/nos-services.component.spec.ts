import { ComponentFixture, TestBed } from '@angular/core/testing';

import {NosServicesComponent } from './nos-services.component';

describe('NosFormationsComponent', () => {
  let component: NosServicesComponent;
  let fixture: ComponentFixture<NosServicesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NosServicesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NosServicesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
