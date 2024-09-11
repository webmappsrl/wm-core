import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { DemoComponent } from './demo.component';

describe('DemoComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [RouterTestingModule],
    declarations: [DemoComponent]
  }));

  it('should create the app', () => {
    const fixture = TestBed.createComponent(DemoComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'demo'`, () => {
    const fixture = TestBed.createComponent(DemoComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('demo');
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(DemoComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.content span')?.textContent).toContain('demo app is running!');
  });
});
