import { TestBed } from '@angular/core/testing';
import { BlockStyleService } from '@features/game/data-access/block-style.service';
import { BoardSymbolsService } from '@features/game/data-access/board-symbols.service';
import { BlockStylePicker } from './block-style-picker';

const STORAGE_KEY = 'clicksteria.block-style';

describe('Block style picker', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('clicksteria.show-symbols');
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('clicksteria.show-symbols');
  });

  it('restores the selected style and updates pressed states after a choice', async () => {
    localStorage.setItem(STORAGE_KEY, 'minimal');
    const fixture = TestBed.createComponent(BlockStylePicker);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(element.querySelectorAll('button'));
    const classic = buttons.find((button) => button.textContent?.trim() === 'Classic')!;
    const minimal = buttons.find((button) => button.textContent?.trim() === 'Minimalist')!;
    expect(element.querySelector('legend')?.textContent).toBe('Block style');
    expect(buttons.map((button) => button.textContent?.trim())).toEqual([
      'Classic',
      'Minimalist',
      'ZX Spectrum',
    ]);
    expect(minimal.getAttribute('aria-pressed')).toBe('true');
    classic.click();
    await fixture.whenStable();
    expect(TestBed.inject(BlockStyleService).style()).toBe('classic');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(classic.getAttribute('aria-pressed')).toBe('true');
    expect(minimal.getAttribute('aria-pressed')).toBe('false');
    expect(element.querySelectorAll('[aria-pressed="true"]')).toHaveLength(1);
  });

  it('updates all previews when symbols are toggled without changing the selected style', async () => {
    const fixture = TestBed.createComponent(BlockStylePicker);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.preview-no-symbols')).toHaveLength(0);

    TestBed.inject(BoardSymbolsService).setEnabled(false);
    await fixture.whenStable();
    expect(element.querySelectorAll('.style-preview.preview-no-symbols')).toHaveLength(3);
    expect(TestBed.inject(BlockStyleService).style()).toBe('classic');

    TestBed.inject(BoardSymbolsService).setEnabled(true);
    await fixture.whenStable();
    expect(element.querySelectorAll('.preview-no-symbols')).toHaveLength(0);
  });

  it('selects and restores ZX Spectrum while preserving the shared symbols choice', async () => {
    localStorage.setItem('clicksteria.show-symbols', 'false');
    const fixture = TestBed.createComponent(BlockStylePicker);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const spectrum = Array.from(element.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'ZX Spectrum',
    )!;
    expect(spectrum.querySelector('.preview-spectrum.preview-no-symbols')).toBeTruthy();

    spectrum.click();
    await fixture.whenStable();
    expect(TestBed.inject(BlockStyleService).style()).toBe('spectrum');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('spectrum');
    expect(spectrum.getAttribute('aria-pressed')).toBe('true');
    expect(element.querySelectorAll('[aria-pressed="true"]')).toHaveLength(1);

    TestBed.resetTestingModule();
    const restored = TestBed.createComponent(BlockStylePicker);
    await restored.whenStable();
    const returned = restored.nativeElement as HTMLElement;
    expect(TestBed.inject(BlockStyleService).style()).toBe('spectrum');
    expect(returned.querySelector('[aria-pressed="true"]')?.textContent?.trim()).toBe(
      'ZX Spectrum',
    );
    expect(returned.querySelectorAll('.style-preview.preview-no-symbols')).toHaveLength(3);

    TestBed.inject(BoardSymbolsService).setEnabled(true);
    await restored.whenStable();
    expect(returned.querySelectorAll('.preview-no-symbols')).toHaveLength(0);
    expect(TestBed.inject(BlockStyleService).style()).toBe('spectrum');
  });
});
