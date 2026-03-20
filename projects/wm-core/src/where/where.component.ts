import {ChangeDetectionStrategy, Component, computed, input, ViewEncapsulation} from '@angular/core';
import {TaxonomyWhereEntry, TaxonomyWhereMap} from '@wm-types/feature';
import {Language, LANGUAGES} from '@wm-types/language';

interface NormalizedWhereItem {
  adminLevel: number;
  label: Partial<Record<Language, string>>;
}

@Component({
  standalone: false,
  selector: 'wm-where',
  templateUrl: './where.component.html',
  styleUrls: ['./where.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmWhereComponent {
  taxonomyWheres = input<TaxonomyWhereMap | null | undefined>(null);

  private _normalized = computed<NormalizedWhereItem[]>(() => {
    const value = this.taxonomyWheres();
    return Object.values(value ?? {})
      .map(entry => {
        const adminLevel = this._asAdminLevel(entry);
        if (adminLevel == null) return null;
        return {adminLevel, label: this._asLabel(entry)};
      })
      .filter((v): v is NormalizedWhereItem => v != null);
  });

  municipalityWheres = computed(() => this._normalized().filter(w => w.adminLevel === 8));
  provinceWheres = computed(() => this._normalized().filter(w => w.adminLevel === 6));
  regionWheres = computed(() => this._normalized().filter(w => w.adminLevel === 4));
  hasWhereInfo = computed(
    () =>
      this.municipalityWheres().length > 0 ||
      this.provinceWheres().length > 0 ||
      this.regionWheres().length > 0,
  );

  private _asAdminLevel(where: TaxonomyWhereEntry): number | null {
    const raw = where?._admin_level;
    if (raw === undefined || raw === null) return null;
    const num = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(num) ? num : null;
  }

  private _asLabel(where: TaxonomyWhereEntry): Partial<Record<Language, string>> {
    const label: Partial<Record<Language, string>> = {};
    for (const [k, v] of Object.entries(where)) {
      if (v === undefined || v === null) continue;
      if (!(LANGUAGES as readonly string[]).includes(k)) continue;
      if (typeof v === 'string' || typeof v === 'number') label[k as Language] = String(v);
    }
    return label;
  }
}
