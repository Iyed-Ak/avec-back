import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormationService } from '../frms.service';
import { CommonModule } from '@angular/common';
import { InscriptionComponent } from '../inscription/inscription.component';

@Component({
  selector: 'app-details',
  imports: [CommonModule,InscriptionComponent],
  templateUrl: './details.component.html',
  styleUrl: './details.component.css'
})
export class FormationDetailComponent implements OnInit {
  formation: any;
  selectedImage: string | null = null; // Variable pour gérer l'image principale sélectionnée

  constructor(
    private route: ActivatedRoute,
    private formationService: FormationService
  ) {}

  ngOnInit() {
    const name = this.route.snapshot.params['name'];
    this.formationService.getFormationByName(name).subscribe(data => {
      this.formation = data;
    });
  }
  selectImage(image: string) {
    this.selectedImage = image; // Met à jour l'image principale
}

  // Contrôler l'affichage du formulaire
  isFormVisible: boolean = false;

  // Méthodes pour afficher ou cacher le formulaire
  showInscriptionForm(): void {
    this.isFormVisible = true;
  }

  hideInscriptionForm(): void {
    this.isFormVisible = false;
  }
   // Gérer la fermeture du formulaire
   onCloseForm() {
    this.isFormVisible = false;  // Cacher le formulaire quand l'événement est émis
  }
  
}
