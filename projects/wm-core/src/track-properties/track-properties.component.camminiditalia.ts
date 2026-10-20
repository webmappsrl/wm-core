// Variante camminiditalia di wm-track-properties (oc:8169), attivata con `fileReplacements`: stesso
// template e stessi stili del default, accende soltanto la sezione delle esperienze. Non importa
// nulla da `track-properties.component.ts`, che `fileReplacements` sostituisce con questo file.
import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {TrackPropertiesBaseComponent} from './track-properties-base.component';

@Component({
  standalone: false,
  selector: 'wm-track-properties',
  templateUrl: './track-properties.component.html',
  styleUrls: ['./track-properties.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class TrackPropertiesComponent extends TrackPropertiesBaseComponent {
  override readonly showExperiences: boolean = true;
}
