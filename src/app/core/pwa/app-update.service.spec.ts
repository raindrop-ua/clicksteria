import { ApplicationRef, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SwUpdate, UnrecoverableStateEvent, VersionEvent } from '@angular/service-worker';
import { BehaviorSubject, Subject } from 'rxjs';
import { AppUpdateService } from './app-update.service';
import { UpdateBannerComponent } from '../../shared/ui/update-banner/update-banner.component';

describe('App updates', () => {
  let stable: BehaviorSubject<boolean>;
  let versions: Subject<VersionEvent>;
  let unrecoverable: Subject<UnrecoverableStateEvent>;
  let check: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    stable = new BehaviorSubject(false);
    versions = new Subject();
    unrecoverable = new Subject();
    check = vi.fn().mockResolvedValue(false);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    TestBed.configureTestingModule({
      providers: [
        { provide: ApplicationRef, useValue: { isStable: stable } },
        {
          provide: SwUpdate,
          useValue: {
            isEnabled: true,
            versionUpdates: versions,
            unrecoverable,
            checkForUpdate: check,
          },
        },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function ready(hash = 'new') {
    versions.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'old' },
      latestVersion: { hash },
    });
  }

  it('announces only downloaded updates, preserving a ready update on failed checks', () => {
    const service = TestBed.inject(AppUpdateService);
    versions.next({ type: 'VERSION_DETECTED', version: { hash: 'new' } });
    expect(service.notice()).toBeNull();
    versions.next({
      type: 'VERSION_INSTALLATION_FAILED',
      version: { hash: 'new' },
      error: 'offline',
    });
    expect(service.notice()).toBeNull();
    ready();
    expect(service.notice()).toBe('ready');
    versions.next({ type: 'NO_NEW_VERSION_DETECTED', version: { hash: 'new' } });
    expect(service.notice()).toBe('ready');
  });

  it('keeps a recovery prompt even when another version becomes ready', () => {
    const service = TestBed.inject(AppUpdateService);
    unrecoverable.next({ type: 'UNRECOVERABLE_STATE', reason: 'Missing chunk' });
    ready();
    expect(service.notice()).toBe('unrecoverable');
  });

  it('waits for stability and retries rejected checks on reconnect and return', async () => {
    check.mockRejectedValueOnce(new Error('offline'));
    TestBed.inject(AppUpdateService);
    await vi.advanceTimersByTimeAsync(1000);
    expect(check).not.toHaveBeenCalled();
    stable.next(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(check).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(0);
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(0);
    expect(check).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(6 * 60 * 60 * 1000);
    expect(check).toHaveBeenCalledTimes(4);
  });

  it('skips hidden/offline checks and prevents overlapping downloads', async () => {
    let finish!: (value: boolean) => void;
    check.mockReturnValue(new Promise<boolean>((resolve) => (finish = resolve)));
    TestBed.inject(AppUpdateService);
    stable.next(true);
    await vi.advanceTimersByTimeAsync(0);
    window.dispatchEvent(new Event('online'));
    expect(check).toHaveBeenCalledTimes(1);
    finish(false);
    await vi.advanceTimersByTimeAsync(0);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    window.dispatchEvent(new Event('online'));
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(check).toHaveBeenCalledTimes(1);
  });

  it('does not start in SSR or when workers are disabled', async () => {
    TestBed.overrideProvider(PLATFORM_ID, { useValue: 'server' });
    const service = TestBed.inject(AppUpdateService);
    stable.next(true);
    ready();
    await vi.advanceTimersByTimeAsync(0);
    expect(check).not.toHaveBeenCalled();
    expect(service.notice()).toBeNull();
  });

  it('ignores worker events when disabled', () => {
    TestBed.overrideProvider(SwUpdate, { useValue: { isEnabled: false } });
    expect(TestBed.inject(AppUpdateService).notice()).toBeNull();
    expect(check).not.toHaveBeenCalled();
  });

  it('releases listeners and the polling timer on destruction', async () => {
    const service = TestBed.inject(AppUpdateService);
    stable.next(true);
    await vi.advanceTimersByTimeAsync(0);
    TestBed.resetTestingModule();
    window.dispatchEvent(new Event('online'));
    ready();
    await vi.advanceTimersByTimeAsync(6 * 60 * 60 * 1000);
    expect(check).toHaveBeenCalledTimes(1);
    expect(service.notice()).toBeNull();
  });

  it('renders an accessible banner and reloads only on a user click', () => {
    // Use the real ApplicationRef for component rendering.
    TestBed.resetTestingModule();
    const reload = vi.fn();
    const notice = () => 'ready';
    TestBed.configureTestingModule({
      providers: [{ provide: AppUpdateService, useValue: { notice, reload } }],
    });
    const fixture = TestBed.createComponent(UpdateBannerComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[aria-live="polite"]')).toBeTruthy();
    expect(element.textContent).toContain('Refreshing starts a new game');
    expect(reload).not.toHaveBeenCalled();
    element.querySelector('button')?.click();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
