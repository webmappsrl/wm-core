import {BuildSvgDirective} from './build-svg.directive';
import {CommonModule} from '@angular/common';
import {DistancePipe} from './distance.pipe';
import {DurationPipe} from './duration.pipe';
import {MinuteTimePipe} from './minutetime.pipe';
import {NgModule} from '@angular/core';
import {WmGetFilterIcnPipe} from './wm-get-filter-icn.pipe';
import {WmGetIcnPipe} from './wm-get-icn.pipe';
import {WmTransPipe} from './wmtrans.pipe';

const pipes = [
  WmTransPipe,
  MinuteTimePipe,
  DistancePipe,
  DurationPipe,
  WmGetFilterIcnPipe,
  WmGetIcnPipe,
  BuildSvgDirective,
];
@NgModule({
  declarations: pipes,
  imports: [CommonModule],
  exports: pipes,
})
export class WmPipeModule {}
