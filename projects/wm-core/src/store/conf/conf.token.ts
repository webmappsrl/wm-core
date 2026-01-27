import {InjectionToken} from '@angular/core';
import {WmTranslations} from '@wm-types/language';
import {WmPosthogClient, WmPosthogConfig} from '@wm-types/posthog';
import {Environment} from '@wm-types/environment';

export const APP_VERSION = new InjectionToken<string>('APP_VERSION');
export const APP_TRANSLATION = new InjectionToken<WmTranslations>('APP_TRANSLATION');
export const POSTHOG_CLIENT = new InjectionToken<WmPosthogClient>('POSTHOG_CLIENT');
export const POSTHOG_CONFIG = new InjectionToken<WmPosthogConfig>('POSTHOG_CONFIG');
export const ENVIRONMENT_CONFIG = new InjectionToken<Environment>('ENVIRONMENT_CONFIG');
