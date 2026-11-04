import {DateRange} from '../shared/date-range-picker/date-range.utils';
import {Injectable} from '@angular/core';
import {deviceDiaryDrafts} from '@wm-core/utils/localForage';
import {DiaryRatings} from './diary.model';

/** Chiave di una bozza: una per contesto e per utente (oc:8169, ciclo 2). */
export type DiaryDraftKey = string;

/** Bozza del form del diario salvata sul telefono mentre si scrive. */
export interface StoredDiaryDraft {
  key: DiaryDraftKey;
  userId: number;
  /** Uuid del diario nuovo: riusato alla riapertura, così un nuovo invio non crea un doppione. */
  uuid: string;
  layerId?: number;
  ecTrackId?: number;
  /** Presente solo per la bozza della modifica di un diario già pubblicato. */
  diaryId?: number;
  description: string;
  photos: Blob[];
  keepMediaIds?: number[];
  publicationConsent: boolean;
  /** Valutazioni scelte (oc:8169, ciclo 2); assenti nelle bozze salvate prima. */
  ratings?: DiaryRatings;
  /** Date di percorrenza (ciclo 4): `undefined` = campo non toccato. */
  walkDates?: DateRange | null;
  /** Messaggio di un invio dalla coda rifiutato dal server: il form lo mostra alla riapertura. */
  errorMessage?: string;
  /** Ultima modifica (ms): la bozza scade dopo `DIARY_RETENTION_DAYS`. */
  updatedAt: number;
}

/**
 * Chiave della bozza: `u<utente>:d<id>` per la modifica di un diario, altrimenti
 * `u<utente>:l<cammino>:t<tappa>` con tappa 0 per il diario del cammino.
 *
 * @param userId utente che scrive
 * @param ctx cammino, tappa o diario in modifica
 * @returns la chiave della bozza
 */
export function diaryDraftKey(
  userId: number,
  ctx: {layerId?: number; ecTrackId?: number; diaryId?: number},
): DiaryDraftKey {
  if (ctx.diaryId != null) return `u${userId}:d${ctx.diaryId}`;
  return `u${userId}:l${ctx.layerId ?? 0}:t${ctx.ecTrackId ?? 0}`;
}

/** Bozze del form del diario in localforage (`device/diaryDrafts`), foto comprese come Blob. */
@Injectable({providedIn: 'root'})
export class DiaryDraftStore {
  /**
   * Salva (o sostituisce) una bozza.
   * @param draft bozza da salvare
   */
  async save(draft: StoredDiaryDraft): Promise<void> {
    await deviceDiaryDrafts.setItem(draft.key, draft);
  }

  /**
   * Legge una bozza.
   * @param key chiave della bozza
   * @returns la bozza, o `null` se non c'è
   */
  async load(key: DiaryDraftKey): Promise<StoredDiaryDraft | null> {
    return (await deviceDiaryDrafts.getItem<StoredDiaryDraft>(key)) ?? null;
  }

  /**
   * Cancella una bozza.
   * @param key chiave della bozza
   */
  async remove(key: DiaryDraftKey): Promise<void> {
    await deviceDiaryDrafts.removeItem(key);
  }

  /**
   * Cancella le bozze con ultima modifica più vecchia di `days` giorni.
   * @param days giorni di conservazione
   * @param now istante di riferimento (ms)
   * @returns quante bozze sono state cancellate
   */
  async purgeOlderThan(days: number, now: number = Date.now()): Promise<number> {
    const limit = now - days * 24 * 60 * 60 * 1000;
    const old: string[] = [];
    await deviceDiaryDrafts.iterate<StoredDiaryDraft, void>((value, key) => {
      if ((value?.updatedAt ?? 0) < limit) old.push(key);
    });
    await Promise.all(old.map(k => deviceDiaryDrafts.removeItem(k)));
    return old.length;
  }
}
