/* eslint-disable @angular-eslint/template/eqeqeq */
import {Component, ChangeDetectionStrategy, Input} from '@angular/core';

@Component({
  standalone: false,
  selector: 'wm-address',
  template: `
    <ion-item
      *ngIf="address != null && address !== ''"
      [href]="mapsHref"
      target="_blank"
      rel="noopener noreferrer"
    >
      <i class="icon-fill-pin" slot="start"></i>
      <ion-label>{{address}}</ion-label>
    </ion-item>
  `,
  styles: [
    `
      ion-item {
        padding: 0;
        i {
          color: var(--wm-color-icon, var(--ion-color-primary));
        }
        ion-label {
          font-weight: 600;
          color: var(--wm-feature-details-description-color, var(--wm-color-dark));
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WmAddressComponent {
  @Input() address: string;

  /**
   * URL di navigazione Google Maps, costruito dall'indirizzo mostrato a schermo.
   *
   * **Non da `address_link`**, che pure esisteva per questo: quel campo unisce con `+` per
   * pre-codificare gli spazi, ma `encodeURIComponent` trasforma poi quei `+` in `%2B`, cioè in un
   * più letterale dentro l'indirizzo — `Via%2BRoma%2B1%2C%2BPisa` invece di
   * `Via%20Roma%201%2C%20Pisa`. Le due codifiche si annullavano a vicenda e chi toccava il link
   * finiva su una ricerca sbagliata.
   */
  get mapsHref(): string {
    return `https://www.google.com/maps?daddr=${encodeURIComponent(this.address)}&navigate=yes`;
  }
}
