import { NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '@shared/ui/icon';

@Component({
  imports: [NgOptimizedImage, RouterLink, Icon],
  templateUrl: './not-found-page.html',
  styleUrl: './not-found-page.css',
})
export default class NotFoundPage {}
