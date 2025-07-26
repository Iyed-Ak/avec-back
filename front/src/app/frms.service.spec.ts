import { TestBed } from '@angular/core/testing';

import { FrmsService } from './frms.service';

describe('FrmsService', () => {
  let service: FrmsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FrmsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
