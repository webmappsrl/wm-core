import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { DownloadService } from 'src/app/services/download.service';
import { IGeojsonFeature } from 'src/app/types/model';

@Component({
  selector: 'webmapp-card-track',
  templateUrl: './card-track.component.html',
  styleUrls: ['./card-track.component.scss'],
})
export class CardTrackComponent implements OnInit {

  @Input('track') track: IGeojsonFeature;
  @Input('isDownload') isDownload: boolean = false;
  @Output('open') openClick: EventEmitter<IGeojsonFeature> = new EventEmitter<IGeojsonFeature>();
  @Output('remove') removeClick: EventEmitter<IGeojsonFeature> = new EventEmitter<IGeojsonFeature>();

  constructor(
    private download: DownloadService
  ) { }

  async ngOnInit() {
  }

  open() {
    this.openClick.emit(this.track);
  }

  remove() {
    this.removeClick.emit(this.track);
  }

  // getImage(url) {
  //   if (this.cache[url] && this.cache[url] != 'waiting') return this.cache[url]
  //   else {
  //     if (this.cache[url] !== 'waiting') {
  //       this.cache[url] = 'waiting';
  //       this.download.getB64img(url).then(val => {
  //         this.cache[url] = val;
  //       })
  //     }
  //   }
  //   return '';
  // }

  sizeInMB(size) {
    const million = 1000000;
    if (size > million) {
      return Math.round(size / million)
    } else {
      return Math.round(size * 100 / million) / 100;
    }
  }
}
