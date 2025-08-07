import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PopulaireComponent } from './populaire.component';

describe('PopulaireComponent', () => {
  let component: PopulaireComponent;
  let fixture: ComponentFixture<PopulaireComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PopulaireComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PopulaireComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
