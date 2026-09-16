import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LegalLayout } from './legal-layout';

@Component({
  imports: [LegalLayout],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-legal-layout title="Privacy Policy">
      <p>
        Clicksteria is a free browser game created and operated by Anton Sizov. You can play without
        an account. The game itself does not set cookies, use analytics or advertising trackers, or
        send your scores or moves to a server. Our hosting and delivery services are described
        below.
      </p>
      <section>
        <h2>What stays in your browser</h2>
        <p>Clicksteria uses local storage on your device to remember:</p>
        <ul class="mt-3">
          <li>Your best score.</li>
          <li>Your selected color theme.</li>
          <li>Whether game sounds are enabled.</li>
        </ul>
        <p class="mt-3">
          These values are not used to identify or track you, and are not uploaded by the game. They
          stay in this browser until you clear the site's data or your browser removes them. Your
          current board and move history are kept in memory and reset when you reload the page.
        </p>
        <p>
          The game also caches website files on your device to help it load and work offline. You
          can remove saved preferences, your best score, and cached files by clearing Clicksteria's
          site data in your browser settings. They do not sync between devices.
        </p>
      </section>
      <section>
        <h2>Website delivery</h2>
        <p>
          Loading a website requires your browser to send technical information, such as your IP
          address, requested URL, and browser details, to the servers delivering it. Clicksteria
          runs on a VPS managed by Anton Sizov, with Cloudflare in front of it to deliver and
          protect the website. The server, its hosting provider, and Cloudflare may process this
          information and keep operational or security logs to serve requests, diagnose problems,
          and prevent abuse. This is separate from gameplay analytics.
        </p>
        <p>
          Depending on the security features in use, Cloudflare may set necessary security cookies,
          for example when checking whether a visitor is human. These are not game tracking cookies.
          See
          <a href="https://www.cloudflare.com/privacypolicy/">Cloudflare's Privacy Policy</a> and
          <a
            href="https://developers.cloudflare.com/fundamentals/reference/policies-compliances/cloudflare-cookies/"
            >information about Cloudflare cookies</a
          >.
        </p>
        <p>
          Technical log retention depends on server settings and the providers' policies. Service
          providers may process requests in countries other than your own.
        </p>
      </section>
      <section>
        <h2>Fonts</h2>
        <p>
          This website loads its Outfit font from Google Fonts. Your browser connects to Google to
          download font files, which shares technical request information, including your IP
          address. Google Fonts is not used here for analytics or advertising. Read
          <a href="https://developers.google.com/fonts/faq/privacy"
            >Google Fonts' privacy information</a
          >
          and <a href="https://policies.google.com/privacy">Google's Privacy Policy</a> for details.
        </p>
      </section>
      <section>
        <h2>Your choices</h2>
        <p>
          You can play without providing your name, email address, or other account details. If
          browser storage is blocked, you can still play, but your preferences and best score may
          not be remembered. Clearing site data deletes the saved values from that browser; the game
          has no server copy to recover.
        </p>
      </section>
      <section>
        <h2>Contact and privacy requests</h2>
        <p>
          Anton Sizov is responsible for this website. For privacy questions, email
          <a href="mailto:contact@antonsizov.com">contacts&#64;antonsizov.com</a>. If you contact
          us, your email address and message will be used to respond and handle your request, and
          kept only as long as needed for that purpose or any legal requirements.
        </p>
        <p>
          Where applicable data protection law requires a legal basis, technical processing is based
          on the legitimate interest in operating and securing the website; correspondence is
          processed to respond to your request. We do not sell personal information or use it for
          advertising.
        </p>
        <p>
          Depending on your location, you may have rights to access, correct, or delete personal
          information, restrict or object to processing, or request a portable copy. You can contact
          the address above to exercise applicable rights, or complain to your local data protection
          authority. Local scores and settings can be deleted directly in your browser.
        </p>
      </section>
      <section>
        <h2>Changes to this policy</h2>
        <p>
          If the way Clicksteria handles information changes, this page will be updated with a new
          revision date. Any new data collection will be described here before it begins.
        </p>
      </section>
    </app-legal-layout>
  `,
})
export default class PrivacyPage {}
