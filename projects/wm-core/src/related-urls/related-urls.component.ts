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

/**
 * Gli unici schemi che possono finire in un `href`. Tutto il resto viene **scartato**.
 *
 * Non è una precauzione teorica: `[href]` su `<ion-item>` è un **input di componente**, non un
 * attributo del DOM, quindi Angular non lo sanitizza — Ionic lo rende tale e quale dentro un
 * `<a href>`. Un `related_url` salvato dall'editor con `javascript:…` eseguirebbe nell'origine
 * dell'app, dove il token sta in `localStorage`. Prima di oc:8406 il vecchio
 * `window.open('https://' + url)` lo rendeva innocuo per costruzione; quando quel codice è stato
 * tolto, la protezione è sparita con lui (oc:8613).
 */
const ALLOWED_SCHEMES = ['http', 'https', 'mailto', 'tel'];

/** `https//host`: lo schema c'è ma mancano i due punti. Visto in 1 valore su 1147. */
const SCHEME_WITHOUT_COLON = /^(https?)\/\//i;

/** Quello che sta prima dei due punti, se ha la forma di uno schema RFC 3986. */
const SCHEME_CANDIDATE = /^([a-z][a-z0-9+.-]*):/i;

/**
 * `host:porta` — `localhost:3000`, `www.sito.it:8080` — ha la stessa forma di uno schema, ma dopo
 * i due punti ha una cifra. Nessuno schema che ci interessi comincia con una cifra, quindi la
 * distinzione è sicura: `javascript:alert(1)` ha una lettera e resta fuori.
 */
const HOST_WITH_PORT = /^[a-z][a-z0-9+.-]*:[0-9]/i;

/**
 * Il bersaglio dell'`href`, oppure `null` se quel valore non deve diventare un link.
 *
 * Tre casi, in ordine:
 *
 * - **schema riconosciuto** (`http`, `https`, `mailto`, `tel`): passa com'è. `http://` resta
 *   `http://`, perché forzare TLS rompe i siti che non lo supportano — è il motivo per cui il
 *   vecchio `replace` era stato tolto;
 * - **niente schema**, o qualcosa che gli somiglia ma è un host — `www.sito.it:8080` ha un punto,
 *   `localhost:3000` ha una cifra dopo i due punti: riceve `https://`. Senza, finirebbe
 *   in `href` come percorso **relativo**, e la webapp aprirebbe `https://<host>/…/www.sito.it`.
 *   Misurato sui POI delle app 75, 29 e 33: 235 URL su 1147 senza schema, il 20,5%;
 * - **schema sconosciuto** (`javascript:`, `data:`, `vbscript:`): **scartato**. Meglio una voce in
 *   meno che un link che esegue codice.
 */
function safeHref(url: string): string | null {
  const conColon = SCHEME_WITHOUT_COLON.test(url)
    ? url.replace(SCHEME_WITHOUT_COLON, '$1://')
    : url;
  const candidato = conColon.match(SCHEME_CANDIDATE);
  if (candidato == null) {
    return `https://${conColon}`;
  }
  if (ALLOWED_SCHEMES.includes(candidato[1].toLowerCase())) {
    return conColon;
  }
  // Non è uno schema ma un host: o contiene un punto, o dopo i due punti c'è una porta.
  if (candidato[1].includes('.') || HOST_WITH_PORT.test(conColon)) {
    return `https://${conColon}`;
  }
  return null;
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
    if (url === '') {
      return [];
    }
    const href = safeHref(url);
    return href == null ? [] : [{label: url, url: href}];
  }
  if (Array.isArray(value)) {
    return value
      .filter((url): url is string => typeof url === 'string' && url.trim() !== '')
      .map(url => ({label: url.trim(), url: safeHref(url.trim())}))
      .filter((entry): entry is RelatedUrlEntry => entry.url != null);
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([label, url]) => label.trim() !== '' && typeof url === 'string' && url.trim() !== '')
      .map(([label, url]) => ({label: label.trim(), url: safeHref((url as string).trim())}))
      .filter((entry): entry is RelatedUrlEntry => entry.url != null);
  }
  return [];
}
