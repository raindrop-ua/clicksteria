import { NgOptimizedImage } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { BoardSceneryService } from '@features/game/data-access/board-scenery.service';
import { isSceneryPreference, SCENERIES } from '@features/game/domain/board-scenery';

@Component({
  selector: 'app-board-scenery-picker',
  imports: [NgOptimizedImage],
  templateUrl: './board-scenery-picker.html',
  styleUrl: './board-scenery-picker.css',
})
export class BoardSceneryPicker {
  protected readonly scenery = inject(BoardSceneryService);
  protected readonly thumbnail = computed(() => {
    const scene = this.scenery.scenery();
    return [
      {
        id: scene.id,
        image: scene.id === 'classic' ? '/images/scenery/classic-thumbnail.jpg' : scene.image,
      },
    ];
  });
  protected readonly seasons = SCENERIES.filter((scene) => scene.group === 'season');
  protected readonly celebrations = SCENERIES.filter((scene) => scene.group === 'celebration');

  protected choose(value: string): void {
    if (isSceneryPreference(value)) this.scenery.setPreference(value);
  }
}
