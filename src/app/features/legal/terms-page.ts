import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LegalLayout } from './legal-layout';

@Component({
  imports: [LegalLayout, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-legal-layout title="Terms of Use">
      <p>
        These terms apply to your use of Clicksteria at clicksteria.com, a free browser puzzle game
        operated by Anton Sizov. By using the website, you agree to these terms. If you do not
        agree, please stop using the website.
      </p>
      <section>
        <h2>Playing the game</h2>
        <p>
          Clicksteria is provided for entertainment, with no account or payment required. Scores
          have no monetary value and do not earn prizes or rewards. You are welcome to play as often
          as you like.
        </p>
      </section>
      <section>
        <h2>Use the website responsibly</h2>
        <p>
          Do not use the website for unlawful purposes, attempt to gain unauthorized access to its
          infrastructure, or interfere with its availability for other people.
        </p>
      </section>
      <section>
        <h2>Local scores and settings</h2>
        <p>
          Your best score and preferences are stored in your browser. They may be lost if you clear
          site data, switch browsers or devices, or if your browser removes them. There is no
          account backup or recovery service. Reloading the page starts a new game. See the
          <a routerLink="/privacy">Privacy Policy</a> for details about browser storage and website
          requests.
        </p>
      </section>
      <section>
        <h2>Code and third-party materials</h2>
        <p>
          Clicksteria's source code is made available under the MIT License. These website terms do
          not restrict the permissions granted by that license. Third-party libraries, fonts, and
          other materials remain subject to their respective licenses.
        </p>
      </section>
      <section>
        <h2>Availability and responsibility</h2>
        <p>
          The game is provided “as is” and “as available.” Features may change, and the website may
          be interrupted or discontinued. To the extent permitted by applicable law, no warranties
          are given that it will always be available, error-free, or suitable for a particular
          purpose.
        </p>
        <p>
          To the extent permitted by applicable law, Anton Sizov is not liable for losses arising
          from use of, or inability to use, the game, including lost local scores or progress.
          Nothing in these terms excludes liability that cannot legally be excluded or limits any
          mandatory consumer rights you may have.
        </p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>
          Questions about the game or these terms? Contact Anton Sizov at
          <a href="mailto:contact@antonsizov.com">contacts&#64;antonsizov.com</a>.
        </p>
      </section>
      <section>
        <h2>Updates to these terms</h2>
        <p>
          These terms may be updated as the game evolves. The date at the top shows the latest
          revision. Changes apply to future use of the website and do not remove rights you already
          have under applicable law.
        </p>
      </section>
    </app-legal-layout>
  `,
})
export default class TermsPage {}
