import {POSTHOG_CLIENT, POSTHOG_CONFIG} from '../store/conf/conf.token';
import {Inject, Injectable, Optional} from '@angular/core';
import {WmPosthogClient, WmPosthogConfig, WmPosthogProps} from '@wm-types/posthog';

class NoopPosthogClient implements WmPosthogClient {
  capture(_event: string, _props?: WmPosthogProps) {}

  public identify(_distinctId: string, _props?: WmPosthogProps) {}

  public initAndRegister(_props: WmPosthogProps) {}

  public reset() {}
}

@Injectable({providedIn: 'root'})
export class PosthogService {
  private readonly client: WmPosthogClient;
  private readonly config?: WmPosthogConfig;

  constructor(
    @Optional() @Inject(POSTHOG_CLIENT) client?: WmPosthogClient,
    @Optional() @Inject(POSTHOG_CONFIG) config?: WmPosthogConfig,
  ) {
    this.client = client ?? new NoopPosthogClient();
    this.config = config;
  }

  private get enabled(): boolean {
    return !!this.config?.enabled;
  }

  capture(event: string, props: WmPosthogProps = {}) {
    if (!this.enabled) return;
    return this.client.capture(event, props);
  }

  identify(distinctId: string, props: WmPosthogProps = {}) {
    if (!this.enabled) return;
    return this.client.identify(distinctId, props);
  }

  initAndRegister(props: WmPosthogProps) {
    if (!this.enabled) return;
    return this.client.initAndRegister(props);
  }

  reset() {
    // reset lo lasciamo passare sempre: utile su logout / cleanup
    return this.client.reset();
  }
}
