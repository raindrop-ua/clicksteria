import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BoardSceneryPicker } from '@features/game/ui/board-scenery-picker/board-scenery-picker';
import { BlockStylePicker } from '@features/game/ui/block-style-picker/block-style-picker';
import { Icon } from '@shared/ui/icon';

@Component({
  imports: [RouterLink, BoardSceneryPicker, BlockStylePicker, Icon],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.css',
})
export default class SettingsPage {}
