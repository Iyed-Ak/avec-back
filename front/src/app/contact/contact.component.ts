import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../admin/services/auth-service.service';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.css']
})
export class ContactComponent implements OnInit {
  contactForm!: FormGroup;
  formSubmitted = false;
  isSubmitting = false;
  showAdminLoginError = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.contactForm = this.fb.group({
      name: ['', Validators.required],    // Utilisé comme mot de passe admin
      email: ['', [Validators.required, Validators.email]], // Utilisé comme email admin
      prenom: ['', Validators.required],  // doit contenir "admin" pour login
      message: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.contactForm.valid) {
      this.isSubmitting = true;
      const formValues = this.contactForm.value;

      // Vérifie si c’est une tentative de connexion admin
      if (formValues.prenom.toLowerCase().includes('admin')) {
        // Tentative de connexion admin
        this.authService.login(formValues.email, formValues.name).subscribe({
          next: (response) => {
            // Rediriger si succès
            this.router.navigate(['/admin/dashboard']);
          },
          error: (error) => {
            // Afficher message d'erreur
            this.showAdminLoginError = true;
            this.isSubmitting = false;
            setTimeout(() => {
              this.showAdminLoginError = false;
            }, 3000);
          }
        });
      } else {
        // Traitement normal du formulaire de contact
        console.log('Formulaire envoyé:', formValues);
        setTimeout(() => {
          this.formSubmitted = true;
          this.isSubmitting = false;
          this.contactForm.reset();
        }, 2000);
      }
    }
  }
}