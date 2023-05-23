import {BuildSvgDirective} from './build-svg.directive';
import {CommonModule} from '@angular/common';
import {DistancePipe} from './distance.pipe';
import {DurationPipe} from './duration.pipe';
import {MinuteTimePipe} from './minutetime.pipe';
import {NgModule} from '@angular/core';
import {WmGetFilterIcnPipe} from './wm-get-filter-icn.pipe';
import {WmGetIcnPipe} from './wm-get-icn.pipe';
import {WmTransPipe} from './wmtrans.pipe';
import {WmGetDataPipe} from './wm-get-data.pipe';
import {WmToMbPipe} from './wm-to-mb.pipe';
import {WmHowMany} from './wm-how-many.pipe';
import {WmOrderedBySelection} from './wm-filter-by-selection.pipe';

const pipes = [
  WmTransPipe,
  MinuteTimePipe,
  DistancePipe,
  DurationPipe,
  WmGetFilterIcnPipe,
  WmGetIcnPipe,
  BuildSvgDirective,
  WmGetDataPipe,
  WmToMbPipe,
  WmHowMany,
  WmOrderedBySelection,
];
@NgModule({
  declarations: pipes,
  imports: [CommonModule],
  exports: pipes,
})
export class WmPipeModule {}
