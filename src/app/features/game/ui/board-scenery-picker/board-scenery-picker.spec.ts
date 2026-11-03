import { TestBed } from '@angular/core/testing';
import { BoardSceneryService } from '@features/game/data-access/board-scenery.service';
import { SCENERIES } from '@features/game/domain/board-scenery';
import { BoardSceneryPicker } from './board-scenery-picker';

describe('Board scenery picker', () => {
  beforeEach(() => localStorage.removeItem('clicksteria.scenery'));

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    localStorage.removeItem('clicksteria.scenery');
  });

  async function setup() {
    const fixture = TestBed.createComponent(BoardSceneryPicker);
    await fixture.whenStable();
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    return { fixture, select, service: TestBed.inject(BoardSceneryService) };
  }

  it('offers a labeled native picker with all seasons, celebrations, lake, and sunset', async () => {
    const { fixture, select } = await setup();
    expect(fixture.nativeElement.querySelector('label')?.htmlFor).toBe(select.id);
    expect(select.options).toHaveLength(16);
    expect(Array.from(select.options).filter((option) => option.value === 'sunset')).toHaveLength(
      1,
    );
    expect(select.value).toBe('auto');
    expect(select.selectedOptions[0].textContent).toContain('Auto ·');
    expect(fixture.nativeElement.querySelector('#scenery-help')?.textContent).toContain(
      'local calendar',
    );
  });

  it('applies a user choice and reflects later preference changes in the control', async () => {
    const { fixture, select, service } = await setup();
    select.value = 'winter';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(service.preference()).toBe('winter');
    expect(localStorage.getItem('clicksteria.scenery')).toBe('winter');
    expect(fixture.nativeElement.querySelector('img')?.getAttribute('src')).toBe(
      '/images/scenery/winter-thumbnail.jpg',
    );
    service.setPreference('classic');
    await fixture.whenStable();
    expect(select.value).toBe('classic');
    expect(fixture.nativeElement.querySelector('img')?.getAttribute('src')).toBe(
      '/images/scenery/classic-thumbnail.jpg',
    );
  });

  it('uses dedicated thumbnails for every scenery and includes the optional sunset', async () => {
    const { fixture, select, service } = await setup();
    for (const scene of SCENERIES) {
      service.setPreference(scene.id);
      await fixture.whenStable();
      expect(select.value).toBe(scene.id);
      expect(fixture.nativeElement.querySelector('img')?.getAttribute('src')).toBe(scene.thumbnail);
    }
    expect(select.selectedOptions[0].textContent).toContain('Sunset mountains');
    expect(localStorage.getItem('clicksteria.scenery')).toBe('sunset');
  });

  it('shows the selected option when returning to the game with an existing preference', async () => {
    const { fixture, service } = await setup();
    service.setPreference('summer');
    await fixture.whenStable();
    fixture.destroy();
    const returned = await setup();
    expect(returned.service).toBe(service);
    expect(returned.select.value).toBe('summer');
    expect(returned.select.selectedOptions[0].textContent).toContain('Summer');
  });
});
