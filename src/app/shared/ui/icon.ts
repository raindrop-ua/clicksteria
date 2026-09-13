import { ChangeDetectionStrategy, Component, input } from '@angular/core';
const PATHS = {
  monitor: 'M3 4h18v12H3zM8 20h8m-4-4v4',
  sun: 'M12 3v1m0 16v1M3 12h1m16 0h1M5.6 5.6l.7.7m11.4 11.4.7.7M5.6 18.4l.7-.7M17.7 6.3l.7-.7M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  moon: 'M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z',
  undo: 'M9 4 4 9l5 5M4 9h9a7 7 0 1 1-6.1 10.4',
  bulb: 'M9 18h6m-5 3h4M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 2H9s0-1-1-2Z',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  plus: 'M12 5v14M5 12h14',
} as const;
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', class: 'inline-flex shrink-0' },
  template:
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path [attr.d]="paths[name()]" /></svg>',
})
export class Icon {
  readonly name = input.required<keyof typeof PATHS>();
  protected readonly paths = PATHS;
}
