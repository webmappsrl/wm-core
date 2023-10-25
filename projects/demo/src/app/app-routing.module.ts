import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';

const routes: Routes = [
  {
    path: 'webmapp-title',
    loadChildren: () =>
      import('./pages/webmapp-title/webmapp-title.module').then(m => m.WebmappTitleModule),
  },
  {
    path: 'wm-slug-box',
    loadChildren: () =>
      import('./pages/wm-slug-box/wm-slug-box.module').then(m => m.WmSlugBoxModule),
  },
  {
    path: 'wm-layer-box',
    loadChildren: () =>
      import('./pages/wm-layer-box/wm-layer-box.module').then(m => m.WmLayerBoxModule),
  },
  {
    path: 'wm-status-filter',
    loadChildren: () =>
      import('./pages/wm-status-filter/wm-status-filter.module').then(m => m.WmStatusFilterModule),
  },
  {
    path: 'wm-search-box',
    loadChildren: () =>
      import('./pages/wm-search-box/wm-search-box.module').then(m => m.WmSearchBoxModule),
  },
  {
    path: 'wm-poi-box',
    loadChildren: () => import('./pages/wm-poi-box/wm-poi-box.module').then(m => m.WmPoiBoxModule),
  },
  {
    path: 'wm-horizontal-scroll-box',
    loadChildren: () =>
      import('./pages/wm-horizontal-scroll-box/wm-horizontal-scroll-box.module').then(
        m => m.WmHorizontalScrollBoxModule,
      ),
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
