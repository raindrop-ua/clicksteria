import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LegalLayout } from './legal-layout';

@Component({
  imports: [LegalLayout, RouterLink],
  templateUrl: './terms-page.html',
  styleUrl: './terms-page.css',
})
export default class TermsPage {}
