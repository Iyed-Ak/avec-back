import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormationsListComponent } from './formations-list.component';

describe('FormationsListComponent', () => {
  let component: FormationsListComponent;
  let fixture: ComponentFixture<FormationsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormationsListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FormationsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
