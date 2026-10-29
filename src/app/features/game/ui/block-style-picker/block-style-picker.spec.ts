import { TestBed } from '@angular/core/testing';
import { BlockStyleService } from '@features/game/data-access/block-style.service';
import { BlockStylePicker } from './block-style-picker';

const STORAGE_KEY = 'clicksteria.block-style';

describe('Block style picker', () => {
  beforeEach(() => localStorage.removeItem(STORAGE_KEY));

  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.removeItem(STORAGE_KEY);
  });

  it('restores the selected style and updates pressed states after a choice', async () => {
    localStorage.setItem(STORAGE_KEY, 'glass');
    const fixture = TestBed.createComponent(BlockStylePicker);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(element.querySelectorAll('button'));
    const glass = buttons.find((button) => button.textContent?.includes('Glass'))!;
    const minimal = buttons.find((button) => button.textContent?.includes('Minimal'))!;
    expect(element.querySelector('legend')?.textContent).toBe('Block style');
    expect(glass.getAttribute('aria-pressed')).toBe('true');
    minimal.click();
    await fixture.whenStable();
    expect(TestBed.inject(BlockStyleService).style()).toBe('minimal');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('minimal');
    expect(minimal.getAttribute('aria-pressed')).toBe('true');
    expect(glass.getAttribute('aria-pressed')).toBe('false');
    expect(element.querySelectorAll('[aria-pressed="true"]')).toHaveLength(1);
  });
});
