// Variante camminiditalia di wm-ugc-track-properties (oc:8169), attivata con `fileReplacements`:
// stesso template e stessi stili del default, accende soltanto le esperienze collegate. Non importa
// nulla da `ugc-track-properties.component.ts`, che `fileReplacements` sostituisce con questo file.
import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {UgcTrackPropertiesBaseComponent} from './ugc-track-properties-base.component';

// il tipo resta esportato da qui: l'app lo importa da questo percorso (`ShareService`, `MapPageBase`)
export type {UgcTrackShareResult} from './ugc-track-properties-base.component';

@Component({
  standalone: false,
  selector: 'wm-ugc-track-properties',
  templateUrl: './ugc-track-properties.component.html',
  styleUrls: ['./ugc-track-properties.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class UgcTrackPropertiesComponent extends UgcTrackPropertiesBaseComponent {
  override readonly showExperiences: boolean = true;
}
