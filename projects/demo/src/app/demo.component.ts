import { Component } from '@angular/core';

@Component({
  standalone: false,
  selector: 'demo-root',
  templateUrl: './demo.component.html',
  styleUrls: ['./demo.component.scss']
})
export class DemoComponent {
  title = 'demo';
}
