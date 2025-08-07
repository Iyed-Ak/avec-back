import { CommonModule } from '@angular/common';
import { Component, OnInit,OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-slider',
  imports:[CommonModule,RouterModule],
  templateUrl: './slider.component.html',
  styleUrls: ['./slider.component.css']
})

export class SliderComponent implements OnInit, OnDestroy {
  slides = [
    { image: '/img/rtx.webp', alt: 'Formation en développement web' },
    { image: '/img/mega.webp', alt: 'Formation en communication' },
    { image: '', alt: 'Formation en design graphique' }
  ];
  
  currentIndex = 0;
  autoSlideInterval: any;

  ngOnInit(): void {
    this.startAutoSlide();
  }

  ngOnDestroy(): void {
    this.stopAutoSlide();
  }

  prevSlide(): void {
    this.currentIndex = (this.currentIndex > 0) ? this.currentIndex - 1 : this.slides.length - 1;
  }

  nextSlide(): void {
    this.currentIndex = (this.currentIndex < this.slides.length - 1) ? this.currentIndex + 1 : 0;
  }

  goToSlide(index: number): void {
    this.currentIndex = index;
  }

  startAutoSlide(): void {
    this.autoSlideInterval = setInterval(() => {
      this.nextSlide();
    }, 3000); // Changement toutes les 3 secondes
  }

  stopAutoSlide(): void {
    if (this.autoSlideInterval) {
      clearInterval(this.autoSlideInterval);
    }
  }
}