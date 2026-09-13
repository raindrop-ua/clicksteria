import { ChangeDetectionStrategy, Component, input } from '@angular/core';
const PATHS = {
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
