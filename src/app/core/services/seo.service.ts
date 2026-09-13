import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

export interface SeoData {
  description: string;
  socialDescription?: string;
  canonicalPath?: string;
  robots?: string;
}

const SITE_ORIGIN = 'https://clicksteria.com';
const SOCIAL_IMAGE = `${SITE_ORIGIN}/og-image.png`;
const SOCIAL_IMAGE_ALT =
  'Clicksteria logo beside colorful puzzle blocks popping out of the game board';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly document = inject(DOCUMENT);
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);
  private readonly router = inject(Router);

  constructor() {
    const destroyRef = inject(DestroyRef);

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe(() => this.update());
  }

  private update(): void {
    const route = this.deepestPrimaryRoute(this.router.routerState.snapshot.root);
    const seo = route.data['seo'] as SeoData | undefined;

    if (!seo) return;

    const title = route.title ?? this.title.getTitle();
    const socialDescription = seo.socialDescription ?? seo.description;
    const currentPath = this.router.url.split(/[?#]/, 1)[0] || '/play';
    const pageUrl = new URL(currentPath, SITE_ORIGIN).href;

    this.meta.updateTag({ name: 'description', content: seo.description });
    this.meta.updateTag({ name: 'robots', content: seo.robots ?? 'index, follow' });
    this.meta.updateTag({ property: 'og:url', content: pageUrl });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: socialDescription });
    this.meta.updateTag({ property: 'og:image', content: SOCIAL_IMAGE });
    this.meta.updateTag({ property: 'og:image:alt', content: SOCIAL_IMAGE_ALT });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: socialDescription });
    this.meta.updateTag({ name: 'twitter:image', content: SOCIAL_IMAGE });
    this.meta.updateTag({ name: 'twitter:image:alt', content: SOCIAL_IMAGE_ALT });

    this.updateCanonical(seo.canonicalPath);
  }

  private updateCanonical(path: string | undefined): void {
    const existing = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

    if (!path) {
      existing?.remove();
      return;
    }

    const canonical = existing ?? this.document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href = new URL(path, SITE_ORIGIN).href;

    if (!existing) this.document.head.append(canonical);
  }

  private deepestPrimaryRoute(route: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
    return route.firstChild ? this.deepestPrimaryRoute(route.firstChild) : route;
  }
}
