import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import type {SwiperOptions} from 'swiper/types';

@Component({
  standalone: false,
  selector: 'wm-swiper',
  template: `
    <swiper-container
      #swiperEl
      [ngClass]="class"
      (swiperslidechange)="onSlideChange($event)"
      (swipertouchend)="onTouchEnd($event)">
      <ng-content></ng-content>
    </swiper-container>
  `,
  styles: [
    `
    :host {
      display: block;
      width: 100%;
    }
  `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmSwiperComponent implements OnChanges, AfterViewInit {
  /**
   * Opzioni di configurazione per Swiper
   * Accetta un oggetto con tutte le opzioni supportate da Swiper.js
   */
  @Input() options: SwiperOptions = {};

  /**
   * Classe CSS personalizzata per il swiper-container
   */
  @Input() class?: string;

  /**
   * Evento emesso quando cambia lo slide
   */
  @Output() swiperslidechange = new EventEmitter<any>();

  /**
   * Evento emesso quando finisce il touch
   */
  @Output() swipertouchend = new EventEmitter<any>();

  @ViewChild('swiperEl') swiperEl!: ElementRef;

  /**
   * Espone swiperEl per permettere l'accesso all'istanza Swiper dall'esterno
   */
  get swiper() {
    return this.swiperEl?.nativeElement?.swiper;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options'] && !changes['options'].firstChange) {
      this.init();
    }
  }

  ngAfterViewInit(): void {
    this.init();
  }

  private init(): void {
    try {
      const swiperElement = this.swiperEl.nativeElement;
      if (swiperElement.swiper) {
        swiperElement.swiper.destroy(true, true);
      }
      Object.assign(swiperElement, this.options);
      swiperElement.initialize();
    } catch (error) {
      console.error('Error initializing Swiper:', error);
    }
  }

  /**
   * Gestisce l'evento swiperslidechange e lo propaga
   */
  onSlideChange(event: any): void {
    this.swiperslidechange.emit(event);
  }

  /**
   * Gestisce l'evento swipertouchend e lo propaga
   */
  onTouchEnd(event: any): void {
    this.swipertouchend.emit(event);
  }
}
