// Variante camminiditalia di wm-ugc-box (oc:8764), attivata con `fileReplacements`: senza il
// bottone di import da file, perché il passaporto si basa solo sulle tracce registrate dall'app.
// La logica sta in `UgcBoxBaseComponent` e il template è quello di default: la variante spegne
// soltanto il bottone.
import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {Observable, of} from 'rxjs';
import {UgcBoxBaseComponent} from './ugc-box-base.component';

@Component({
  standalone: false,
  selector: 'wm-ugc-box',
  templateUrl: './ugc-box.component.html',
  styleUrls: ['./ugc-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class UgcBoxComponent extends UgcBoxBaseComponent {
  showUgcUploaderButton$: Observable<boolean> = of(false);
}
