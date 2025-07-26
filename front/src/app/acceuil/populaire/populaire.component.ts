import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormationService } from '../../frms.service';

@Component({
  selector: 'app-populaire',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './populaire.component.html',
  styleUrl: './populaire.component.css'
})
export class PopulaireComponent implements OnInit {
  featuredFormations: any[] = []; // Liste des formations populaires
  selectedIndices: number[] = [0, 4, 8]; // Indices que tu veux afficher

  constructor(private formationService: FormationService) {}

  ngOnInit(): void {
    this.getFeaturedFormations();
  }

  getFeaturedFormations(): void {
    this.formationService.getFormations().subscribe(allFormations => {
      this.featuredFormations = this.selectedIndices
        .filter(index => index < allFormations.length)
        .map(index => allFormations[index]);
    });
  }
}
