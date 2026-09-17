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
  @Input() addressLink: string;

  /**
   * URL di navigazione Google Maps. Usa `addressLink` se c'è — è la forma unita con `+`, adatta
   * a finire in un URL — altrimenti ripiega sull'indirizzo mostrato a schermo.
   */
  get mapsHref(): string {
    const destination =
      this.addressLink != null && this.addressLink !== '' ? this.addressLink : this.address;
    return `https://www.google.com/maps?daddr=${encodeURIComponent(destination)}&navigate=yes`;
  }
}
