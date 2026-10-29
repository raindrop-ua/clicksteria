import { Component, inject } from '@angular/core';
import { BlockStyleService } from '@features/game/data-access/block-style.service';
import { BLOCK_STYLES } from '@features/game/domain/block-style';

@Component({
  selector: 'app-block-style-picker',
  templateUrl: './block-style-picker.html',
  styleUrl: './block-style-picker.css',
})
export class BlockStylePicker {
  protected readonly blockStyle = inject(BlockStyleService);
  protected readonly styles = BLOCK_STYLES;
}
