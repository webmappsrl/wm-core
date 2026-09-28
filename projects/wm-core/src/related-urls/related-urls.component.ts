/* eslint-disable @angular-eslint/template/eqeqeq */
import {Component, ChangeDetectionStrategy, Input} from '@angular/core';

/** Una voce pronta per il rendering: etichetta visibile e URL di destinazione. */
export interface RelatedUrlEntry {
  label: string;
  url: string;
}

@Component({
  standalone: false,
  selector: 'wm-related-urls',
  template: `
    <ion-list *ngIf="entries.length > 0">
      <ion-item
        *ngFor="let entry of entries"
        [href]="entry.url"
        target="_blank"
        rel="noopener noreferrer"
      >
          <i class="icon-outline-globe" slot="start"></i>
          <ion-label>{{entry.label}}</ion-label>
      </ion-item>
    </ion-list>
`,
  styles: [`
    ion-list {
      padding: 0;
      ion-item {
        i{
          color: var(--wm-color-icon, var(--ion-color-primary));
        }
        ion-label {
          font-weight: 600;
          color: var(--wm-feature-details-description-color, var(--wm-color-dark));
        }
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WmRelatedUrlsComponent {
  entries: RelatedUrlEntry[] = [];

  /**
   * Il campo arriva dal backend in tre forme, conseguenza deterministica di `EcPoi::getJson()`
   * (`geohub/app/Models/EcPoi.php:282`), che lo rimuove solo se `!is_array && empty`: oggetto
   * `{label: url}` (752 POI sull'app 29), **stringa** con un URL nudo (76 POI), array (3).
   * Il precedente `relatedUrls|keyvalue` in template assumeva sempre l'oggetto: su una stringa
   * iterava i singoli caratteri, producendo una voce per lettera.
   */
  @Input('relatedUrls') set relatedUrls(value: unknown) {
    this.entries = normalizeRelatedUrls(value);
  }
}

/** Uno schema RFC 3986: una lettera seguita da lettere, cifre, `+`, `-`, `.` e poi i due punti. */
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/** `https//host` e `http//host`: lo schema c'è ma mancano i due punti. Visto in 1 valore su 1147. */
const SCHEME_WITHOUT_COLON = /^(https?)\/\//i;

/**
 * L'etichetta mostrata resta il valore così com'è arrivato; questo è solo il bersaglio dell'`href`.
 *
 * Un valore senza schema — `www.prolocox.it` — in un `href` è un percorso **relativo**: la webapp
 * aprirebbe `https://<host>/…/www.prolocox.it` e l'app `capacitor://localhost/…`. Prima di oc:8406
 * il codice toglieva lo schema e riprefissava sempre `https://`, quindi questo caso funzionava; il
 * fix per non forzare TLS sui siti che non lo supportano ha tolto anche quella correzione.
 * Misurato sui POI delle app 75, 29 e 33: **235 URL su 1147** non hanno schema, il 20,5%.
 *
 * `http://` resta `http://`: il motivo per cui il `replace` era stato tolto vale ancora.
 */
function withScheme(url: string): string {
  if (SCHEME_WITHOUT_COLON.test(url)) {
    return url.replace(SCHEME_WITHOUT_COLON, '$1://');
  }
  return HAS_SCHEME.test(url) ? url : `https://${url}`;
}

/**
 * Normalizza `related_url` in voci mostrabili, gestendo le tre forme che il backend può inviare.
 * Scarta gli URL vuoti e le voci con etichetta vuota — 100 POI hanno una chiave `""`, che
 * renderebbe una riga senza testo — e per stringa/array usa l'URL stesso come etichetta.
 *
 * Nessun `replace` sullo schema: la versione precedente rimuoveva `http://` o `https://` e
 * riprefissava sempre `https://`, rompendo i link dei siti che non supportano TLS. Misurato su
 * db_prod: **1.013 POI** e **1.127 EcTrack** hanno almeno un URL `http://` puro — comuni, pro loco,
 * siti turistici locali.
 *
 * @param value Il valore grezzo di `properties.related_url`.
 * @returns Le voci con etichetta e URL non vuoti, nell'ordine di arrivo.
 */
export function normalizeRelatedUrls(value: unknown): RelatedUrlEntry[] {
  if (value == null) {
    return [];
  }
  if (typeof value === 'string') {
    const url = value.trim();
    return url === '' ? [] : [{label: url, url: withScheme(url)}];
  }
  if (Array.isArray(value)) {
    return value
      .filter((url): url is string => typeof url === 'string' && url.trim() !== '')
      .map(url => ({label: url.trim(), url: withScheme(url.trim())}));
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([label, url]) => label.trim() !== '' && typeof url === 'string' && url.trim() !== '')
      .map(([label, url]) => ({label: label.trim(), url: withScheme((url as string).trim())}));
  }
  return [];
}
