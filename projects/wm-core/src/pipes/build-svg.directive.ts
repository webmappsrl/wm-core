import {Directive, ElementRef, Input} from '@angular/core';

@Directive({
  selector: '[appBuildSvg]',
})
export class BuildSvgDirective {
  constructor(public readonly elementRef: ElementRef) {}
  @Input() set svg(svg: string) {
    this.elementRef.nativeElement.innerHTML = svg;
  }
  @Input() set color(color: string) {
    if (color) {
      this.elementRef.nativeElement.innerHTML = this.elementRef.nativeElement.innerHTML.replaceAll(
        'darkorange',
        color,
      );
    }
  }
}
