import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormationService } from '../frms.service';
import { CommonModule } from '@angular/common';
import { SliderComponent } from './slider/slider.component';
import { PopulaireComponent } from './populaire/populaire.component';
import { StatComponent } from './stat/stat.component';
import { NosServicesComponent } from './nos-services/nos-services.component';



@Component({
  selector: 'app-acceuil',
  imports: [CommonModule,RouterModule,SliderComponent,NosServicesComponent,PopulaireComponent,StatComponent],
  templateUrl: './acceuil.component.html',
  styleUrl: './acceuil.component.css'
})
export class AcceuilComponent {
 
}


