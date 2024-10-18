# Changelog

## [2.1.0](https://github.com/webmappsrl/wm-core/compare/v2.0.0...v2.1.0) (2024-10-18)


### Features

* Add export-to button module id:2214 ([98a1736](https://github.com/webmappsrl/wm-core/commit/98a1736960e0d496288739dd3cbc25e6c734475e))
* Add storage service for accessing application storage ([846ea79](https://github.com/webmappsrl/wm-core/commit/846ea79d62d4227971b9231e9b6f3fced1f257e8))
* **api:** add getEctrack method ([d37640c](https://github.com/webmappsrl/wm-core/commit/d37640cd173fd0abb1282b9b3ad02da2ad2ccb0d))
* **api:** add new host 'fiemaps.eu' to hostToGeohubAppId ([b36b5e5](https://github.com/webmappsrl/wm-core/commit/b36b5e571efbec7e38d8fa0ad74651afbb8449dd))
* **api:** update getEcTrack method to return null when id is null ([a7f5d61](https://github.com/webmappsrl/wm-core/commit/a7f5d6169f92620ac3291ad1286820849a6805aa))
* **api:** update queryApiSuccess action to include response object ([0fd651d](https://github.com/webmappsrl/wm-core/commit/0fd651d622c610a88903a9e3f49b4a725e90ac47))
* **auth:** add authentication functionality ([d5ecc96](https://github.com/webmappsrl/wm-core/commit/d5ecc964853dee2af4b50ad00f35b1cac30e61f6))
* **conf:** add APP_VERSION injection token ([cb8b87c](https://github.com/webmappsrl/wm-core/commit/cb8b87cecbd861a488507a51e8bebe9d4690b1bb))
* **conf:** add show_searchbar option to config ([6f83622](https://github.com/webmappsrl/wm-core/commit/6f8362266d8e23802dc3ab4a5c109dd4f60def23))
* **conf:** add splash_screen_show to WEBAPP configuration oc: 2556 ([b5c3a48](https://github.com/webmappsrl/wm-core/commit/b5c3a48f029c936699f08df44d88f3fc14b1204b))
* **filters:** add color to filter icons ([d7be46b](https://github.com/webmappsrl/wm-core/commit/d7be46b6412289eb5cb76c295fb8a067e1aab88c))
* **inner-html:** add enableDismiss input ([1dece2e](https://github.com/webmappsrl/wm-core/commit/1dece2eeeb5e350fd7105258cfee92391a71dfe0))
* **inner-html:** add inner html component ([68a8c4a](https://github.com/webmappsrl/wm-core/commit/68a8c4a923bed2b541f11692fa06b891aaaca3d2))
* **login:** add login component ([7c9ea59](https://github.com/webmappsrl/wm-core/commit/7c9ea595873deb416a5cf04f340d25eca6d06881))
* **profile-auth:** add profile authentication component ([eb45289](https://github.com/webmappsrl/wm-core/commit/eb45289fad1dfeaa05a42b4108b6c2164f165482))
* **select-filter:** add icon support to select filter component ([a3c8bd6](https://github.com/webmappsrl/wm-core/commit/a3c8bd6ef018e39c73ac4178c5e297b97f3bd80a))
* **track-download-urls:** Add track download URLs component ([08370a3](https://github.com/webmappsrl/wm-core/commit/08370a328f6097ca075b633e6504b182c72b5837))
* **track-download-urls:** Refactor track download URLs component ([8e146f5](https://github.com/webmappsrl/wm-core/commit/8e146f57d286273feaa79963da354c8c7c186527))


### Bug Fixes

* **api:** add support for motomappa.motoabbigliament ([4f33d82](https://github.com/webmappsrl/wm-core/commit/4f33d8205e1f120d9bb5f1a6ba6d9c9b94286992))
* Fix export functionality in ExportToBtnComponent oc:3935 ([be79d84](https://github.com/webmappsrl/wm-core/commit/be79d8405987061bb273198ff0b7b1dd686a6725))
* **inner-html.component:** added safe area ([cbacf3d](https://github.com/webmappsrl/wm-core/commit/cbacf3d417ef69cd3c9e7cea257af75c6e7e1f38))
* photo and save services ([17130b8](https://github.com/webmappsrl/wm-core/commit/17130b89c16b84fd522d5513b9706c61cc75c22c))
* **save.service:** add error handling and logging to syncUgc() ([ee6d571](https://github.com/webmappsrl/wm-core/commit/ee6d571b88424112f1de4554fd80dcc4825db0a4))
* **style:** horizontal scroll & track box id: 2635 ([a386ebd](https://github.com/webmappsrl/wm-core/commit/a386ebd63e14d3ec8609d124065ccc9f95f43e9b))
* **style:** select filter revert old style ([b9af543](https://github.com/webmappsrl/wm-core/commit/b9af543388cf6a1570eb073ae138c9917561bb0f))
* **track-download-urls:** Add export functionality for GPX, KML, and GeoJSON formats ([6adf0f0](https://github.com/webmappsrl/wm-core/commit/6adf0f0a2b491bca6e702c4f4eb67c7dc474ed1d))
* **types:** update type for taxonomyActivities in IHIT interface ([db150c8](https://github.com/webmappsrl/wm-core/commit/db150c825f53bcd7faf3c8b10ae2230e3b7fabe1))
* update lang ([36e02be](https://github.com/webmappsrl/wm-core/commit/36e02be7339df2312405d2e636ff6e9cf18c5d20))


### Miscellaneous

* Add PRIVACY field to confFeature selector and ICONF interface ([#12](https://github.com/webmappsrl/wm-core/issues/12)) ([feec553](https://github.com/webmappsrl/wm-core/commit/feec553e0266fff23805f2b177c7fd330f14a059))
* **api:** add 'fiemaps.it' to hostToGeohubAppId ([fb4a6f5](https://github.com/webmappsrl/wm-core/commit/fb4a6f516865bc98ea1dc41e9b9fc995f7cfe0ba))
* **api:** close loading indicator after fetching pois ([37f4a4f](https://github.com/webmappsrl/wm-core/commit/37f4a4ffb601fdf388352746c9c25a7ad5f216d8))
* **api:** Update elasticQueryReducer to filter out 'where_' identifiers ([0d7d169](https://github.com/webmappsrl/wm-core/commit/0d7d1690c360fc6c1536a3a615124e36920bf80f))
* **inner-component:** minor fix ([48f2fde](https://github.com/webmappsrl/wm-core/commit/48f2fdeec1395a38587e3c2407e76ea0b452f457))
* Refactor exportToBtnComponent.export() method ([01483e1](https://github.com/webmappsrl/wm-core/commit/01483e1408df1c55e4f9d9814a11912b86426a31))
* Refactor slope-chart.component.ts ([a9ab1c5](https://github.com/webmappsrl/wm-core/commit/a9ab1c59e92fdebaf50b62f6693eaf1626774b09))
* Remove unnecessary margin-bottom in home-result.component.scss ([37102b5](https://github.com/webmappsrl/wm-core/commit/37102b5659b6d9058054b2955572d30ac76f432c))
* Remove unused import and providers in poi-type-filter-box.component.ts ([021cb9d](https://github.com/webmappsrl/wm-core/commit/021cb9d09b60bc29c96b4bb7be9b48f32d8959b0))
* Remove unused property from IAPP interface ([06ecd73](https://github.com/webmappsrl/wm-core/commit/06ecd73eb1574dbc521bef8a0c1d85dd76f945ff))
* Remove unused translations and code ([e0bbaf9](https://github.com/webmappsrl/wm-core/commit/e0bbaf95eb5a25fc0590fcf98d8e5a85691e17c7))
* Rename app files and components ([89d3a08](https://github.com/webmappsrl/wm-core/commit/89d3a081a2088f64a832b20cb9a6e02da8af727d))
* Update API actions, effects, reducer, and selector ([6223d7f](https://github.com/webmappsrl/wm-core/commit/6223d7f28ba7a91e3b8bde1b211454e573b51d1c))
* Update API and Conf service oc: 3789 ([fecc399](https://github.com/webmappsrl/wm-core/commit/fecc399abaec6a53cb5420cf06517ec94fd32259))
* Update API and Conf services ([30fd5bf](https://github.com/webmappsrl/wm-core/commit/30fd5bfdd2822b830182a2294fb0dc5c39f27b17))
* Update API and configuration URLs ([7ff859f](https://github.com/webmappsrl/wm-core/commit/7ff859f36ddff478d9f034f32773421d6a346ce1))
* Update API service to dynamically assign geohub app IDs based on hostname ([73006c5](https://github.com/webmappsrl/wm-core/commit/73006c5b00b01578dac51a7c9c303ed4f9870cc0))
* Update auth.effects.ts ([5a578bb](https://github.com/webmappsrl/wm-core/commit/5a578bb88e8d26249dfac565e1f7a6976f69d5cb))
* Update auth.interceptor.ts ([519cff7](https://github.com/webmappsrl/wm-core/commit/519cff7ca311f5d0076411cb457fd8b9146958f4))
* Update configuration with new map source URL. Add 'maps.acquasorgente.cai.it' to map sources. oc: 3578 ([ded82f4](https://github.com/webmappsrl/wm-core/commit/ded82f4027d0b0dcff0fdfa8f3d7a6bb3ab92931))
* Update dependencies and imports ([ebe49f3](https://github.com/webmappsrl/wm-core/commit/ebe49f391ffb5d4b4de27b7462f5bc999f8fe4f1))
* Update export-to and track-download-urls components ([1645eee](https://github.com/webmappsrl/wm-core/commit/1645eee77a91924637a1f248bdc994035259b8ca))
* Update export-to.component.ts and track-download-urls.component.ts ([ed3fbe0](https://github.com/webmappsrl/wm-core/commit/ed3fbe03d8652e632d4107af5e102b05f22acfd8))
* Update export-to.component.ts and track-download-urls.component.ts ([b6409b3](https://github.com/webmappsrl/wm-core/commit/b6409b38b7357b8dee06df45ef29ff01adbcbb4e))
* Update filters.component.scss ([83f821a](https://github.com/webmappsrl/wm-core/commit/83f821a28863b55ea641528e113e557a4747d009))
* Update geohubAppId for different hostnames ([134e652](https://github.com/webmappsrl/wm-core/commit/134e652d47242485bc3988af9ae3e41dee823575))
* Update geohubAppId for different hostnames ([e6b43b3](https://github.com/webmappsrl/wm-core/commit/e6b43b3539f73a3cd234eab0d396a1238cad06b8))
* Update geohubAppId mappings in ApiService and ConfService ([52c6f69](https://github.com/webmappsrl/wm-core/commit/52c6f6957867836713c9784ce8795a432ee8e08e))
* Update home-layer.component.ts and lang-selector.component.ts ([3d68681](https://github.com/webmappsrl/wm-core/commit/3d6868146d4c8753af1c29798ea9517d5287d432))
* Update home-result.component.html ([c0e2ed8](https://github.com/webmappsrl/wm-core/commit/c0e2ed81748ec92ca15b2a3183f1838d704331d4))
* Update home-result.component.ts ([bda57b4](https://github.com/webmappsrl/wm-core/commit/bda57b40581c2e7c274bb4eda482e46d75733852))
* Update hostToGeohubAppId in api.service.ts and conf.service.ts ([#15](https://github.com/webmappsrl/wm-core/issues/15)) ([715b2f5](https://github.com/webmappsrl/wm-core/commit/715b2f5d9ec5c961a81b720d05819d5083c3a829))
* update IAPP interface ([041cd26](https://github.com/webmappsrl/wm-core/commit/041cd26be370994a559f4c5f713385b14cb43e15))
* Update lang.service.ts and conf.selector.ts ([e2b9f4d](https://github.com/webmappsrl/wm-core/commit/e2b9f4d0a006a612b50a769b2ece168d55191830))
* Update localization files ([87b3476](https://github.com/webmappsrl/wm-core/commit/87b3476e434113073340b0525d4923bfab700fe9))
* Update localization files with new translations for multiple languages and add corresponding UI elements. ([#11](https://github.com/webmappsrl/wm-core/issues/11)) ([ca92b50](https://github.com/webmappsrl/wm-core/commit/ca92b507d807763a03687b107799eba3a36f94dc))
* Update localization for Italian, German, and English languages ([4cce6a9](https://github.com/webmappsrl/wm-core/commit/4cce6a935c5602f8fd04abcaec421e6d493aee65))
* update localization for multiple languages ([3eb1481](https://github.com/webmappsrl/wm-core/commit/3eb148158c83949df06978b9a35a227ee847da20))
* Update login.component.ts ([60d0b6e](https://github.com/webmappsrl/wm-core/commit/60d0b6edefdb7b847fec5b0e3b970ba375822e7c))
* Update main.ts to import AppModule from './app/demo.module' instead of './app/app.module' ([fe44538](https://github.com/webmappsrl/wm-core/commit/fe44538108115f88595bb244160a646cfa51964c))
* Update profile-auth, profile-data, profile-records, profile-user, and register components ([1f1b46c](https://github.com/webmappsrl/wm-core/commit/1f1b46cf0eb8c502ac77030dba5cdb5730dda57a))
* Update register.component.ts and auth.effects.ts ([59e299b](https://github.com/webmappsrl/wm-core/commit/59e299b5d202efe233dd908eb8db3109eec479bc))
* Update search-box and home-result components ([ffad3b2](https://github.com/webmappsrl/wm-core/commit/ffad3b2f2a920b17d7dd2f892999e9985ffc02c4))
* Update search-box.component.html and elastic.ts ([caed57f](https://github.com/webmappsrl/wm-core/commit/caed57f81e6c1f59252453f285a6cb1cc9a0c9ac))
* Update slope-chart component oc:4013 ([ae50456](https://github.com/webmappsrl/wm-core/commit/ae504560c4bd89d9f6cc970d62e7f390da9146cd))
* Update slope-chart.component.ts ([45100e6](https://github.com/webmappsrl/wm-core/commit/45100e604442bc21673aa1c2c2733bc7309b3794))
* Update status-filter and home-result components st:2242 ([ac0f0f3](https://github.com/webmappsrl/wm-core/commit/ac0f0f3171e244e8d0f6b49cab62c1a2a43cdb28))
* Update status-filter component ([25a8475](https://github.com/webmappsrl/wm-core/commit/25a84750cbddd81a9c76e2a045793b1fe36a04c6))
* Update status-filter.component.scss and home-result.component.ts ([42250ff](https://github.com/webmappsrl/wm-core/commit/42250ff3491fa69c406050fc3ea4f1b782dba2cd))
* Update subproject ([09f6b33](https://github.com/webmappsrl/wm-core/commit/09f6b337d8437d7d16dd08a8d5ca4085679e6eb8))
* Update subproject ([d28af87](https://github.com/webmappsrl/wm-core/commit/d28af8799140ae148592670687b352bf20cd9e30))
* Update subproject ([a9eb514](https://github.com/webmappsrl/wm-core/commit/a9eb514ab656af861b1e10a4ac21ab4539a90795))
* Update subproject components ([3e8d39e](https://github.com/webmappsrl/wm-core/commit/3e8d39e7eb626b9ce9cbfce769f2f795ecfe8cd9))
* Update subproject with new map configuration data. Add 'maps.caipontedera.it' to the map configurations. ([57eb630](https://github.com/webmappsrl/wm-core/commit/57eb630d83a48c06d27dc8ba8ba0f18af41d5781))
* Update subproject with new map data for 'parcoapuane' location. ([de86025](https://github.com/webmappsrl/wm-core/commit/de86025fcd1b9329e2b6392b6bc049adb23c7699))
* Update tab-detail component HTML for displaying difficulty in Italian if available. ([869cb37](https://github.com/webmappsrl/wm-core/commit/869cb37c1e9a5165e3a8d6e3151e08edcaf73e36))
* Update tab-detail.component.html ([1edf0e8](https://github.com/webmappsrl/wm-core/commit/1edf0e80642a25a0ab91e3db3140a3e7f9d9f975))
* Update tab-detail.component.html oc:4097 ([a0e60b4](https://github.com/webmappsrl/wm-core/commit/a0e60b430d53bf531782591528bf3da65d248043))
* Update tab-detail.component.html to fix icon classes oc:3019 ([6b915f0](https://github.com/webmappsrl/wm-core/commit/6b915f017734e1458b69dba966acdeb65b1e17b7))
* Update track-download-urls.component.html ([9fa14aa](https://github.com/webmappsrl/wm-core/commit/9fa14aa9a060e3576d757e2e38ced6717b9c40d9))
* Update track-edges.component.ts ([23f5f85](https://github.com/webmappsrl/wm-core/commit/23f5f85365f3962b9f12cf50dbe4f4101be1ac11))
* Update translations for various activities in multiple languages. Added translations for "horse" activity. ([2b571fb](https://github.com/webmappsrl/wm-core/commit/2b571fb615433bfaff0baaa4e48d30f952f482a4))

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
