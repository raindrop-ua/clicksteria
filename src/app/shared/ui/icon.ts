import { Component, input } from '@angular/core';
const PATHS = {
  volume: 'M11 4 6 8H3v8h3l5 4ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
  'volume-off': 'M11 4 6 8H3v8h3l5 4Zm5 5 5 6m0-6-5 6',
  undo: 'M9 4 4 9l5 5M4 9h9a7 7 0 1 1-6.1 10.4',
  bulb: 'M9 18h6m-5 3h4M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 2H9s0-1-1-2Z',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  plus: 'M12 5v14M5 12h14',
  play: 'M8 4.5 20 12 8 19.5Z',
  book: 'M12 5.5C9 3.5 5 3.5 2 5v15c3-1.5 7-1.5 10 .5m0-15c3-2 7-2 10-.5v15c-3-1.5-7-1.5-10 .5Zm0 0v15',
  settings:
    'm9 3-.5 2-2 .9-1.8-.7-2 3.5 1.5 1.4v2.3l-1.5 1.4 2 3.5 1.8-.7 2 .9.5 2h4l.5-2 2-.9 1.8.7 2-3.5-1.5-1.4v-2.3l1.5-1.4-2-3.5-1.8.7-2-.9-.5-2Zm7 9a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  trophy: 'M8 3h8v7a4 4 0 0 1-8 0ZM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 2v6m-4 0h8',
  blocks: 'M9 3h6v6H9ZM3 15h6v6H3Zm12 0h6v6h-6Z',
  mountain: 'm2 20 7-14 4 7 3-5 6 12Zm5-10 2 2 2-2',
  check: 'm5 12 4 4L19 6',
} as const;
@Component({
  selector: 'app-icon',
  host: { 'aria-hidden': 'true' },
  templateUrl: './icon.html',
  styleUrl: './icon.css',
})
export class Icon {
  readonly name = input.required<keyof typeof PATHS>();
  protected readonly paths = PATHS;
}
