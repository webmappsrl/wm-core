import {Injectable, Type} from '@angular/core';
import {AlertController, IonNav, ModalController, Platform} from '@ionic/angular';
import {Store} from '@ngrx/store';
import {firstValueFrom} from 'rxjs';
import {isLogged} from '@wm-core/store/auth/auth.selectors';
import {openLoginModal} from '@wm-core/store/user-activity/user-activity.action';
import {PassportLeaveGuard} from '@wm-core/passport/passport-leave-guard';
import {Diary} from './diary.model';
import {DiaryFormHost, WmDiaryFormComponent} from './diary-form/diary-form.component';
import {
  DiaryDetailHost,
  WmDiaryDetailComponent,
} from './diary-detail/diary-detail.component';

/**
 * Contenitore con un proprio meccanismo di guard (la modale del Passaporto): quando form e
 * dettaglio sono spinti nel suo `ion-nav`, è lui a gestire il back hardware chiedendo `canLeave()`
 * al guard registrato.
 */
export interface DiaryGuardHost {
  registerGuard(guard: PassportLeaveGuard | null): void;
  /**
   * Chiude l'intero contenitore (la modale del Passaporto), rispettando il suo guard.
   *
   * @returns `true` se si è chiuso davvero.
   */
  close?(): Promise<boolean>;
}

/** Host della modale aperta dal launcher, passato a chi costruisce l'host della pagina. */
interface DiaryModalHost extends DiaryFormHost {
  /** Chiude la modale senza chiedere conferma; `true` se si è chiusa davvero. */
  exit(): Promise<boolean>;
}

/** Opzioni di apertura del form. */
export interface DiaryFormOptions {
  layerId?: number;
  ecTrackId?: number;
  /** Cammino e tappa mostrati in cima al form. */
  contextLabel: string;
  /** Esperienza da modificare; assente in creazione. */
  diary?: Diary;
  /** `ion-nav` del Passaporto: se c'è, il form viene spinto lì invece che in una modale. */
  nav?: IonNav;
  /** Contenitore di `nav` su cui il form registra il guard (la modale del Passaporto). */
  guardHost?: DiaryGuardHost;
}

/**
 * Priorità del back hardware delle modali aperte dal launcher: sopra quella con cui Ionic chiude
 * gli overlay (100), quindi questo gestore chiude da sé gli alert aperti.
 */
export const DIARY_BACK_PRIORITY = 101;

/**
 * Apre form e dettaglio delle esperienze (oc:8169). Da non loggato apre il login e basta. Dentro
 * il Passaporto spinge le pagine nel suo `ion-nav`; altrove le apre in una modale, e in quel caso
 * l'uscita (swipe, backdrop, back hardware, chiusura) passa dal `canLeave()` del form.
 */
@Injectable({providedIn: 'root'})
export class DiaryLauncherService {
  /** Vero mentre una pagina viene aperta: protegge dal doppio tap. */
  private _opening = false;

  constructor(
    private _store: Store,
    private _modalCtrl: ModalController,
    private _alertCtrl: AlertController,
    private _platform: Platform,
  ) {}

  /**
   * Apre il dettaglio di un'esperienza; «Modifica» apre il form nello stesso contenitore.
   *
   * @param diary Esperienza da mostrare.
   * @param nav `ion-nav` del Passaporto, se il dettaglio va spinto lì.
   * @param guardHost Contenitore di `nav`, per il guard del form aperto da «Modifica».
   */
  async openDetail(diary: Diary, nav?: IonNav, guardHost?: DiaryGuardHost): Promise<void> {
    await this._guarded(async () => {
      const edit = (exp: Diary): void => {
        void this.openForm({diary: exp, contextLabel: diaryContextLabel(exp), nav, guardHost});
      };
      if (nav) {
        // per aprire una registrazione sulla mappa si chiude tutta la modale del Passaporto; senza
        // un contenitore che sappia chiudersi si toglie almeno il dettaglio
        const exit = async (): Promise<boolean> =>
          guardHost?.close ? guardHost.close() : (await nav.pop()) === true;
        const host: DiaryDetailHost = {back: () => void nav.pop(), edit, exit};
        await nav.push(WmDiaryDetailComponent, {diary, host});
        return;
      }
      await this._presentModal(WmDiaryDetailComponent, {diary}, modalHost => ({
        back: () => modalHost.back(),
        edit,
        exit: () => modalHost.exit(),
      }));
    });
  }

  /**
   * Apre il form di creazione o modifica. Da non loggato apre il login e basta.
   *
   * @param opts Contesto del form e contenitore.
   */
  async openForm(opts: DiaryFormOptions): Promise<void> {
    const logged = await firstValueFrom(this._store.select(isLogged));
    if (!logged) {
      this._store.dispatch(openLoginModal());
      return;
    }
    await this._guarded(async () => {
      const inputs = {
        layerId: opts.layerId,
        ecTrackId: opts.ecTrackId,
        contextLabel: opts.contextLabel,
        diary: opts.diary,
      };
      if (opts.nav) {
        const nav = opts.nav;
        // il form ha già chiesto conferma (o ha pubblicato): qui si torna indietro e basta, il
        // back hardware lo gestisce la modale del Passaporto tramite il guard registrato
        const host: DiaryFormHost = {
          back: () => void nav.pop(),
          registerGuard: guard => opts.guardHost?.registerGuard(guard),
        };
        await nav.push(WmDiaryFormComponent, {...inputs, host});
        return;
      }
      await this._presentModal(WmDiaryFormComponent, inputs, modalHost => modalHost);
    });
  }

  /**
   * Esegue un'apertura alla volta: un doppio tap non apre due pagine.
   *
   * @param open Apertura da eseguire.
   */
  private async _guarded(open: () => Promise<void>): Promise<void> {
    if (this._opening) return;
    this._opening = true;
    try {
      await open();
    } finally {
      this._opening = false;
    }
  }

  /**
   * Presenta un componente in una modale a tutto schermo con il guard d'uscita collegato:
   * `canDismiss` chiede `canLeave()` al guard registrato (swipe e backdrop), `back()` ed `exit()`
   * dell'host chiudono senza chiedere di nuovo (chi li chiama ha già chiesto), e il back hardware
   * chiude prima gli alert aperti, poi un overlay della pagina, poi la modale passando da
   * `canDismiss`.
   *
   * @param component Componente da mostrare.
   * @param inputs Input del componente.
   * @param toHost Costruisce l'host del componente a partire da quello della modale.
   */
  private async _presentModal<H>(
    component: Type<unknown>,
    inputs: Record<string, unknown>,
    toHost: (modalHost: DiaryModalHost) => H,
  ): Promise<void> {
    let guard: PassportLeaveGuard | null = null;
    /** Vero quando l'uscita è già stata approvata da chi chiude. */
    let approved = false;
    /** Conferma d'uscita in corso, condivisa da chi chiede di chiudere nel frattempo. */
    let pending: Promise<boolean> | null = null;
    /** Vero mentre il back hardware sta chiudendo la modale. */
    let closing = false;
    let modal: HTMLIonModalElement;
    const modalHost: DiaryModalHost = {
      back: () => {
        approved = true;
        void modal?.dismiss();
      },
      exit: async () => {
        approved = true;
        return (await modal?.dismiss()) === true;
      },
      registerGuard: g => (guard = g),
    };
    modal = await this._modalCtrl.create({
      component,
      componentProps: {...inputs, host: toHost(modalHost)},
      // una sola richiesta di conferma alla volta: swipe e back ravvicinati non aprono due alert
      canDismiss: () => {
        if (approved || !guard) return Promise.resolve(true);
        if (!pending) {
          pending = guard
            .canLeave()
            .then(ok => {
              if (ok) approved = true;
              return ok;
            })
            .finally(() => (pending = null));
        }
        return pending;
      },
    });
    let dismissed = false;
    let backSub: {unsubscribe(): void} | null = null;
    void modal.onDidDismiss().then(() => {
      dismissed = true;
      backSub?.unsubscribe();
    });
    await modal.present();
    // iscritto dopo present(): se present() fallisce non resta un gestore orfano
    if (dismissed) return;
    backSub = this._platform.backButton.subscribeWithPriority(DIARY_BACK_PRIORITY, async () => {
      const alert = await this._alertCtrl.getTop();
      if (alert) {
        await alert.dismiss();
        return;
      }
      if (closing) return;
      if (await guard?.closeOverlay?.()) return;
      closing = true;
      try {
        await modal.dismiss();
      } finally {
        closing = false;
      }
    });
  }
}

/**
 * Cammino e tappa di un'esperienza, per la riga in cima al form di modifica.
 *
 * @param diary Esperienza.
 * @returns «Tappa · Cammino», o solo il cammino.
 */
export function diaryContextLabel(diary: Diary): string {
  const layer = diary.layer?.name ?? '';
  return diary.ecTrack?.name ? `${diary.ecTrack.name} · ${layer}` : layer;
}
