import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '@shared/ui/icon';
@Component({
  imports: [RouterLink, Icon],
  templateUrl: './rules-page.html',
  styleUrl: './rules-page.css',
})
export default class RulesPage {
  protected readonly rules = [
    {
      title: 'Find a group',
      text: 'Two or more matching blocks must share an edge. Diagonal connections do not count. You can turn on block symbols in Settings: a circle, diamond, square, star, or triangle makes each color easier to tell apart.',
    },
    {
      title: 'Make some room',
      text: 'When you remove a group, the blocks above it fall down. If a column becomes empty, the columns to its right shift left. Look for larger groups that will form after the blocks settle.',
    },
    {
      title: 'Try a different path',
      text: 'Undo restores the board and score to the previous move. You can undo every move in the current game, even after it ends, until you reload. Undoing the final move makes the game unfinished and resumable again. A hint highlights the largest available group, but does not guarantee a win.',
    },
    {
      title: 'Clear the board',
      text: 'The game ends when no groups of two or more remain. An empty board means you win! Visiting the rules keeps your game in progress. Reloading resumes an unfinished saved game with its Undo history. After a win or loss, reloading starts a new game and keeps your best score.',
    },
  ];
}
