import { Component } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SoundToggle } from '@shared/ui/sound-toggle/sound-toggle.component';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, SoundToggle, NgOptimizedImage],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.css',
})
export class AppHeader {}
