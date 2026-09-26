import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { App } from './app.component';

describe('App shell', () => {
  it('renders navigation and a main landmark', async () => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideServiceWorker('ngsw-worker.js', { enabled: false })],
    });
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('main')).toBeTruthy();
    expect(element.querySelector('nav')?.textContent).toContain('Rules');
    expect(element.querySelector('a[href="/play"]')).toBeTruthy();
  });
});
