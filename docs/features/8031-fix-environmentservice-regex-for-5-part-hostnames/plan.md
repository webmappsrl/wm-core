> Ticket: oc:8031

# Plan — fix EnvironmentService regex for 5-part hostnames

## Repo di destinazione

Tutto il codice va nel submodule `wm-core` (`src/app/shared/wm-core/`).
Il repo principale `wm-webapp` non viene toccato.

---

## Step 1 — Branch

```bash
cd src/app/shared/wm-core
git checkout -b feature/oc-8031-fix-environmentservice-regex-for-5-part-hostnames
```

---

## Step 2 — Fix regex

**File:** `projects/wm-core/src/services/environment.service.ts`

Riga 12 — sostituire:

```typescript
private _wmpackagesRegex = /^(\d+)\.([a-zA-Z0-9-]+)(?:\.mobile)?\.[^.]+(?:\.[^.]+)?$/;
```

Con:

```typescript
// matches <appId>.<shardName>[.mobile].<tld-parts…> — e.g. 1.camminiditalia.pr-53.surge.sh
private _wmpackagesRegex = /^(\d+)\.([a-zA-Z0-9-]+)(?:\.mobile)?(?:\.[^.]+)+$/;
```

Il cambio è da `\.[^.]+(?:\.[^.]+)?$` (al massimo 2 parti TLD fisse) a `(?:\.[^.]+)+$` (una o più parti TLD, qualsiasi numero).

---

## Step 3 — Spec file

**File nuovo:** `projects/wm-core/src/services/environment.service.spec.ts`

Nessuna registrazione richiesta — `tsconfig.spec.json` usa `"**/*.spec.ts"`.

Struttura dello spec:

```typescript
import {TestBed} from '@angular/core/testing';
import {EnvironmentService} from './environment.service';

describe('EnvironmentService — _wmpackagesRegex', () => {
  let service: EnvironmentService;
  let regex: RegExp;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({providers: [EnvironmentService]});
    service = TestBed.inject(EnvironmentService);
    regex = (service as any)._wmpackagesRegex as RegExp;
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should define _wmpackagesRegex', () => {
    expect(regex).toBeDefined();
    expect(regex).toBeInstanceOf(RegExp);
  });

  // --- casi che devono fare match ---

  it('should match 3-part hostname', () => {
    const m = '1.camminiditalia.surge.sh'.match(regex);  // <id>.<shard>.<tld>.<ext>
    // nota: surge.sh è TLD a 2 parti → 4 parti totali
    expect(m).toBeTruthy();
    expect(m![1]).toBe('1');
    expect(m![2]).toBe('camminiditalia');
  });

  it('should match 4-part hostname (webmapp.it)', () => {
    const m = '1.camminiditalia.webmapp.it'.match(regex);
    expect(m).toBeTruthy();
    expect(m![1]).toBe('1');
    expect(m![2]).toBe('camminiditalia');
  });

  it('should match 4-part hostname with .mobile', () => {
    const m = '1.camminiditalia.mobile.webmapp.it'.match(regex);
    expect(m).toBeTruthy();
    expect(m![1]).toBe('1');
    expect(m![2]).toBe('camminiditalia');
  });

  it('should match 5-part Surge preview hostname', () => {
    const m = '1.camminiditalia.pr-53.surge.sh'.match(regex);
    expect(m).toBeTruthy();
    expect(m![1]).toBe('1');
    expect(m![2]).toBe('camminiditalia');
  });

  it('should match with multi-digit appId', () => {
    const m = '123.myapp.pr-100.surge.sh'.match(regex);
    expect(m).toBeTruthy();
    expect(m![1]).toBe('123');
    expect(m![2]).toBe('myapp');
  });

  // --- casi che NON devono fare match ---

  it('should not match hostname without numeric appId prefix', () => {
    expect('app.webmapp.it'.match(regex)).toBeNull();
  });

  it('should not match hostname starting with text', () => {
    expect('geohub.webmapp.it'.match(regex)).toBeNull();
  });

  it('should not match localhost', () => {
    expect('localhost'.match(regex)).toBeNull();
  });

  it('should not match bare domain without dots', () => {
    expect('webmapp'.match(regex)).toBeNull();
  });
});
```

---

## Step 4 — Verifica test

```bash
# dalla root di wm-core
nvm use 22 && CI=true npx ng test wm-core --configuration=ci
```

I test esistenti (112 spec) devono continuare a passare. Il nuovo spec aggiunge ~9 test.

---

## Step 5 — Commit

```bash
cd src/app/shared/wm-core
git add projects/wm-core/src/services/environment.service.ts
git add projects/wm-core/src/services/environment.service.spec.ts
git commit -m "fix(oc:8031): accept N-part hostnames in _wmpackagesRegex"
```

---

## Note di implementazione

- **Nessuna modifica al branching logic** di `init()` — solo la regex cambia.
- Il guard `!this._oldSubdomains.includes(wmpackagesRegexMatch[2])` rimane invariato.
- Il rischio di crash in `_assignApi()` quando `shardName` non è in `shards` è preesistente e fuori scope — tracciato nelle note della feature.
