import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InscriptionService } from '../inscription.service'; // Assurez-vous que ce chemin est correct

@Component({
  selector: 'app-inscription',
  imports: [CommonModule, FormsModule],
  templateUrl: './inscription.component.html',
  styleUrls: ['./inscription.component.css']
})
export class InscriptionComponent implements OnInit {
  @Input() formation: any;
  @Output() closeForm = new EventEmitter<void>();

  gouvernorats = [
    'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan', 'Béja', 'Jendouba',
    'Kasserine', 'Kairouan', 'Sidi Bouzid', 'Siliana', 'Monastir', 'Mahdia', 'Sousse', 'Kebili',
    'Gabès', 'Medenine', 'Tozeur', 'Gafsa', 'Tataouine', 'Sfax', 'Bizerte', 'Médnine', 'Tunis'
  ];

  emailPattern = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$";
  isSubmitted: boolean = false;
  formSubmitted: boolean = false;

  user = {
    name: '',
    prenom: '',
    email: '',
    telephone: '',
    gouvernorat: '',
    ville: '',
    codePostal: '',
  };

  selectedFile: string | ArrayBuffer | null = null;

  constructor(private inscriptionService: InscriptionService) {} // Injecter le service

  ngOnInit(): void {}

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => this.selectedFile = reader.result;
      reader.readAsDataURL(file);
    }
  }

  closeFormPopup() {
    this.closeForm.emit(); // Ferme le formulaire en émettant un événement
  }

  onSubmit(): void {
    const inscriptionData = {
      formation: {
        name: this.formation.name,
        description: this.formation.shortDescription,
        duration: this.formation.duration,
      },
      user: {
        name: this.user.name,
        prenom: this.user.prenom,
        email: this.user.email,
        telephone: this.user.telephone,
        gouvernorat: this.user.gouvernorat,
        ville: this.user.ville,
        codePostal: this.user.codePostal
      },
      photo: this.selectedFile
    };

    // Envoie les données à l'API via le service
    this.inscriptionService.sendInscription(inscriptionData).subscribe({
      next: (response) => {
        console.log('Inscription envoyée avec succès :', response);
        this.isSubmitted = true;
        this.formSubmitted = true;
      },
      error: (error) => {
        console.error('Erreur lors de l\'envoi de l\'inscription :', error);
        // Gérer l'affichage d'une erreur ici
      }
    });
  }

  closePopup() {
    this.isSubmitted = false; // Ferme le pop-up
    this.closeForm.emit(); // Ferme le formulaire en émettant un événement
  }
}
