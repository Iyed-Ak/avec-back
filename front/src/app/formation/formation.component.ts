import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { FormationService } from '../frms.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-formation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './formation.component.html',
  styleUrl: './formation.component.css'
})
export class FormationComponent implements OnInit {
  formations: any[] = [];

  constructor(private formationService: FormationService) {}

  ngOnInit() {
    this.formationService.getFormations().subscribe(data => {
      this.formations = data;
    });
  }
}
