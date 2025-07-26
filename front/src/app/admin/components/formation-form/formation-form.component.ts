// admin/components/formation-form/formation-form.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-formation-form',
  templateUrl: './formation-form.component.html',
  styleUrls: ['./formation-form.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class FormationFormComponent implements OnInit {
  formationForm: FormGroup;
  editMode: boolean = false;
  formationId: string = '';

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.formationForm = this.fb.group({
      name: ['', Validators.required],
      shortDescription: ['', Validators.required],
      fullDescription: ['', Validators.required],
      duration: ['', Validators.required],
      price: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
      freq: [''],
      cert: ['Oui'],
      image: [''],
      goals: [''],
      content: [''],
      benefits: ['']
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.editMode = true;
        this.formationId = params['id'];
        this.loadFormation(this.formationId);
      }
    });
  }

  loadFormation(id: string): void {
    this.adminService.getFormationById(id).subscribe(formation => {
      // Traiter les tableaux pour les afficher dans les champs textuels
      const goalsString = formation.goals ? formation.goals.join('\n') : '';
      const contentString = formation.content ? formation.content.join('\n') : '';
      const benefitsString = formation.benefits ? formation.benefits.join('\n') : '';
      
      this.formationForm.patchValue({
        name: formation.name,
        shortDescription: formation.shortDescription,
        fullDescription: formation.fullDescription,
        duration: formation.duration,
        price: formation.price,
        freq: formation.freq,
        cert: formation.cert,
        image: formation.image,
        goals: goalsString,
        content: contentString,
        benefits: benefitsString
      });
    });
  }

  saveFormation(): void {
    if (this.formationForm.invalid) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Convertir les champs textuels en tableaux
    const formData = {...this.formationForm.value};
    formData.goals = formData.goals ? formData.goals.split('\n').filter((item: string) => item.trim() !== '') : [];
    formData.content = formData.content ? formData.content.split('\n').filter((item: string) => item.trim() !== '') : [];
    formData.benefits = formData.benefits ? formData.benefits.split('\n').filter((item: string) => item.trim() !== '') : [];
    
    // Ajouter des tableaux vides par défaut pour les champs qui n'existent pas encore
    formData.images = formData.images || [formData.image];
    formData.faq = formData.faq || [];

    if (this.editMode) {
      this.adminService.updateFormation(this.formationId, formData).subscribe(() => {
        alert('Formation mise à jour avec succès');
        this.router.navigate(['/admin/formations']);
      });
    } else {
      this.adminService.addFormation(formData).subscribe(() => {
        alert('Formation ajoutée avec succès');
        this.router.navigate(['/admin/formations']);
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/admin/formations']);
  }
}