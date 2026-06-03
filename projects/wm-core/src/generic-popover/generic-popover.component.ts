import { Component, OnInit } from '@angular/core';

@Component({
  standalone: false,
  selector: 'wm-generic-popover',
  templateUrl: './generic-popover.component.html',
  styleUrls: ['./generic-popover.component.scss'],
})
export class GenericPopoverComponent implements OnInit {

  public title: string = '';
  public message: string = '';

  constructor() { }

  ngOnInit() { }

}
