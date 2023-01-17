import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {map} from 'rxjs/operators';

import {TranslateService} from '@ngx-translate/core';

@Component({
  selector: 'wm-track-audio',
  templateUrl: './track-audio.component.html',
  styleUrls: ['./track-audio.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WmTrackAudioComponent {
  private _audio$: BehaviorSubject<{[lang: string]: string}> = new BehaviorSubject<{
    [lang: string]: string;
  }>({it: ''});

  @Input() set audio(audio: {[lang: string]: string}) {
    const langs = Object.keys(audio);
    this.langs$.next(langs);
    this._audio$.next(audio);
  }

  @ViewChild('player') player: ElementRef;

  audio$: Observable<string | null>;
  currentLang$: BehaviorSubject<string> = new BehaviorSubject<string>('it');
  langs$: BehaviorSubject<string[]> = new BehaviorSubject<string[]>(['it']);

  constructor(private _translateSvc: TranslateService) {
    this.currentLang$.next(this._translateSvc.currentLang);
    this.audio$ = this.currentLang$.pipe(
      map(lang => {
        const audio = this._audio$.value;
        return audio[lang] || null;
      }),
    );
  }

  changeLang(ev: any): void {
    const playerElem = this.player.nativeElement as HTMLAudioElement;
    this.currentLang$.next(ev.detail.value);
    const audio = this._audio$.value;
    playerElem.src = audio[ev.detail.value];
    playerElem.load();
    playerElem.play();
  }
}
