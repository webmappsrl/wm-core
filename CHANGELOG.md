# Changelog

## [2.0.0](https://github.com/webmappsrl/wm-core/compare/v1.0.0...v2.0.0) (2023-10-31)


### ⚠ BREAKING CHANGES

* **api:** This change introduces a new feature that tracks the last filter type used in the application.

### Features

* **api:** add last filter type tracking ([ba4c829](https://github.com/webmappsrl/wm-core/commit/ba4c829927099b907f8709bd35dd523f628dff16))


### Miscellaneous

* Comment out unused code in conf.reducer.ts ([7749eaa](https://github.com/webmappsrl/wm-core/commit/7749eaad35e1f0b2550a2d3fa4e5ebb04e66e954))
* Update API service and configuration reducer ([2aa5e2d](https://github.com/webmappsrl/wm-core/commit/2aa5e2d719de4e012b2ee7a4e7ec35c523b424e6))
* Update config types ([b7ac97b](https://github.com/webmappsrl/wm-core/commit/b7ac97b9326bf510e5d2fe1f7ce6f68900f796df))
* Update select-filter component HTML and SCSS ([017b976](https://github.com/webmappsrl/wm-core/commit/017b9762c93c032d367cca738b9932d9422b2d39)), closes [#1858](https://github.com/webmappsrl/wm-core/issues/1858)
* Update wm-core module imports and paths ([f310e91](https://github.com/webmappsrl/wm-core/commit/f310e91e70b93e8fbfa48ad12e227a1744f4e5ae))

## 1.0.0 (2023-10-03)


### Features

* **facet:** add facet Activities ([fb37135](https://github.com/webmappsrl/wm-core/commit/fb3713559d067644f8161ed4d938db2484c53b29))
* **filter:** add filter close ([439b76b](https://github.com/webmappsrl/wm-core/commit/439b76b59d1aa79008163b67b96515815b6dfd90))
* **filters:** ... ([94f4fae](https://github.com/webmappsrl/wm-core/commit/94f4fae8e7169757f3431bb4b7baf784a9fc4faf))
* **filters:** add reset filters ([994ebc2](https://github.com/webmappsrl/wm-core/commit/994ebc23c8be60d28ab746de5b7999415caadd3d))
* **filters:** implements slider filters ([c9cbb79](https://github.com/webmappsrl/wm-core/commit/c9cbb796007dd8f3ce0d7e42df9ca5400e005784))
* **hide_popups_when_going_to_home:** implements 1006 ([fb66a5b](https://github.com/webmappsrl/wm-core/commit/fb66a5be099681531e1e495e7e287dd3e448753d))
* **home-box:** add components ([106d16a](https://github.com/webmappsrl/wm-core/commit/106d16a5f743bf8ba6968cc08dea245d73d201ba))
* **home-component:** add ([2a7baad](https://github.com/webmappsrl/wm-core/commit/2a7baadc2bf82b31a0eed4a8174beb3122a78353))
* **home-result:** add component ([a614a24](https://github.com/webmappsrl/wm-core/commit/a614a243dfe265717fc89d96388e59dbe2a786c5))
* **home:** add poi type filter ([e304a01](https://github.com/webmappsrl/wm-core/commit/e304a017f4ade8babe2eb8968d4af745368ed446))
* **localization:** add localization ([23805d6](https://github.com/webmappsrl/wm-core/commit/23805d6a143310cc2b4c0ec36701895ba20938aa))
* **properties:** add elevation component ([5cbf3f3](https://github.com/webmappsrl/wm-core/commit/5cbf3f3c32dade193c18a73ae907e6cf30110cc0))
* **status-filter:** add component ([b567c70](https://github.com/webmappsrl/wm-core/commit/b567c705b9487059230e52d2d607f5ecf4aecc17))
* **store/pois:** add poiFilters selector ([f3eca87](https://github.com/webmappsrl/wm-core/commit/f3eca8705b0fd8868a4ea2f8a452a5648790116b))
* **ui_ux_improvements_track_detail:** improvements interface for moving on tracks ([#5](https://github.com/webmappsrl/wm-core/issues/5)) ([fcbb776](https://github.com/webmappsrl/wm-core/commit/fcbb776d9367c3c3e4e69e0bed9566df52c72a26))
* Update slope chart component ([0c468eb](https://github.com/webmappsrl/wm-core/commit/0c468eb8e8d8df077326bde97cbee9ca814fc31c))


### Bug Fixes

* ** change_track_label_based_on_itinerari_sentieri_tappe:** fixed ([9cdd130](https://github.com/webmappsrl/wm-core/commit/9cdd130ba54e227cc692224064dff807efd0ee2e))
* ** Integrazione dei campi Not Accessible e il suo messaggio nella webapp:** added translations in en.ts ([4bb2c7d](https://github.com/webmappsrl/wm-core/commit/4bb2c7df2626a4db91ba52afa65c5cba5b7e4f44))
* ** profile_shift:** implements ([#4](https://github.com/webmappsrl/wm-core/issues/4)) ([0cfe5d2](https://github.com/webmappsrl/wm-core/commit/0cfe5d2563f9ed0e5cf138e28ce74cf91663bd90))
* **api:** now home result filter pois by any taxonomies ([607365d](https://github.com/webmappsrl/wm-core/commit/607365d9fa79d3d60757c8de23a58dab1a023abc))
* **api:** remove useless elastic query call with base_url ([fc8799a](https://github.com/webmappsrl/wm-core/commit/fc8799ac484ed2f61ecea810e10ae3bc87c30184))
* **filters:** fix span height title ([65646d7](https://github.com/webmappsrl/wm-core/commit/65646d7c7394687fcb497cd26fa46902ce6f3e17))
* **HOME_inputTyped_wm_home_result_search:** implements all stories ([c0b2597](https://github.com/webmappsrl/wm-core/commit/c0b259766713d16ae849056fce424bfc7bad4259))
* **home-result:** fix messages in downloading ([dfbcfc5](https://github.com/webmappsrl/wm-core/commit/dfbcfc502dee89075e7d45b132ff7f853706aba6))
* **img:** add lazy loading ([94a5ec9](https://github.com/webmappsrl/wm-core/commit/94a5ec900fff7ec6a0dde6502060e6e41325f459))
* **lang.service:** add try catch ([82d4346](https://github.com/webmappsrl/wm-core/commit/82d43462570629458dc1d7e81ebd012ec934cfc6))
* **langs:** now set default langs ([f5cde06](https://github.com/webmappsrl/wm-core/commit/f5cde06e1064bb9796c3c7d3695a4fd9afce6830))
* **layer-box:** now show layer title if defined ([016938d](https://github.com/webmappsrl/wm-core/commit/016938d89a7748929a6a4a28bbf990499762e657))
* **query_string:** fix search ([53a6ccf](https://github.com/webmappsrl/wm-core/commit/53a6ccf9e7dc065126f578ec5abc1e6f55cf5f3c))
* **search-box-component:** removed optional check on data.name ([ac1a103](https://github.com/webmappsrl/wm-core/commit/ac1a10394c2ff6877fb3aff5c3b5275098447a3c))
* **service/lang:** if defaultLang and currentLang no match inside object take the first ([df25019](https://github.com/webmappsrl/wm-core/commit/df25019611871f4dc3100bfcdf70728022a61bbb))
* **status-filter:** count all activated filters ([297f2b5](https://github.com/webmappsrl/wm-core/commit/297f2b586ce9d103aafec62f52d3d58baa21d09c))
* **track_page_visualization_bug:** overflow-y switched to auto ([24709fd](https://github.com/webmappsrl/wm-core/commit/24709fdaaabfeef856c9f24ea37c56b012984de5))
* **track_remove_empty_titles:** implements ([3b48260](https://github.com/webmappsrl/wm-core/commit/3b482609a17fadaa585d091bd404acfe386dcf55))
* **track-edges:** fix visualization when layer is null ([d8b4fb1](https://github.com/webmappsrl/wm-core/commit/d8b4fb1c3c210850275c796506c36acbe44025a7))
* **translate_no_result:** implements ([#3](https://github.com/webmappsrl/wm-core/issues/3)) ([8b350af](https://github.com/webmappsrl/wm-core/commit/8b350af6d2012057344d2be65b9c6632dfb26882))


### Miscellaneous

* Add release automation workflow ([4865e37](https://github.com/webmappsrl/wm-core/commit/4865e37791734cf91cd3ba4ad9355042edce531d))
