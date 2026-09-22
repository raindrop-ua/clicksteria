import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { ApplicationRef, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate } from '@angular/service-worker';
import {
  catchError,
  defer,
  exhaustMap,
  filter,
  first,
  fromEvent,
  merge,
  of,
  switchMap,
  timer,
} from 'rxjs';

const CHECK_INTERVAL = 6 * 60 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly updates = inject(SwUpdate);
  private readonly document = inject(DOCUMENT);
  private readonly status = signal<'ready' | 'unrecoverable' | null>(null);
  readonly notice = this.status.asReadonly();

  constructor() {
    const app = inject(ApplicationRef);
    const window = this.document.defaultView;
    if (!isPlatformBrowser(inject(PLATFORM_ID)) || !this.updates.isEnabled || !window) return;

    this.updates.versionUpdates.pipe(takeUntilDestroyed()).subscribe((event) => {
      // Detection alone does not mean the files have finished downloading.
      if (event.type === 'VERSION_READY' && this.status() !== 'unrecoverable') {
        this.status.set('ready');
      }
    });
    this.updates.unrecoverable.pipe(takeUntilDestroyed()).subscribe(() => {
      this.status.set('unrecoverable');
    });

    app.isStable
      .pipe(
        first(Boolean),
        switchMap(() =>
          merge(
            timer(0, CHECK_INTERVAL),
            fromEvent(window, 'online'),
            fromEvent(this.document, 'visibilitychange'),
          ),
        ),
        filter(() => this.document.visibilityState === 'visible' && window.navigator.onLine),
        exhaustMap(() =>
          defer(() => this.updates.checkForUpdate()).pipe(
            // Offline/deployment failures are retried on the next check, without interrupting play.
            catchError(() => of(false)),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  reload(): void {
    // Reload lets Angular switch the shell and lazy chunks together.
    this.document.defaultView?.location.reload();
  }
}
