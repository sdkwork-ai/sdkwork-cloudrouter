import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DOWNLOAD_CATALOG_PLATFORMS,
  DOWNLOAD_CATALOG_SCHEMA_VERSION,
  DOWNLOAD_MAX_ACTIONS_PER_CARD,
  DOWNLOAD_MAX_CARDS,
  HOME_MAX_COLLECTION_ROWS,
  HOME_MAX_LIST_ITEMS,
  HOME_SECTIONS,
  checkDownloadCatalog,
  createDefaultHomeContentForm,
  createEmptyDownloadCatalogAction,
  createEmptyDownloadCatalogCard,
  createEmptyDownloadCatalogForm,
  findDownloadCatalogActionWarningCodes,
  findDownloadCatalogCardWarningCodes,
  findIncompleteDownloadCatalog,
  findIncompleteHomeContent,
  readDownloadCatalogForm,
  readDownloadCatalogText,
  readHomeContentForm,
  readInitialDownloadCatalogForm,
  toDownloadCatalogPayload,
  toDownloadCatalogText,
  toHomeContentPayload,
  type DownloadCatalogActionFields,
  type DownloadCatalogCardFields,
  type DownloadCatalogForm,
  type HomeContentForm,
} from './packages/sdkwork-cloudrouter-pc-admin-site/src/siteContentFields.ts';
import { readHomeContent } from './packages/sdkwork-cloudrouter-pc-home/src/content/home-content.ts';
import {
  applyResolvedDownloadUrls,
  cloudRouterDownloadCatalog,
  createCloudRouterDownloadCatalog,
  DOWNLOAD_CATALOG_SCHEMA_VERSION as HOMEPAGE_SCHEMA_VERSION,
  readDownloadActionDriveRefs,
  readRuntimeDownloadCatalog,
} from './packages/sdkwork-cloudrouter-pc-home/src/downloads/cloudRouterDownloads.ts';

/**
 * The console's homepage and downloads editors are an *authoring* model for two documents the
 * landing page owns. Nothing in either package can see the other — the console may not depend on a
 * landing surface — so the shapes are written down twice, and this file is what keeps the two
 * copies honest.
 *
 * It runs the console's output through the *real* runtime reader rather than a second reading of
 * the console's own types: a payload the console believes is a hero section, but that
 * `readHomeContent` does not recognise, would publish an operator's headline into a field the
 * landing page never draws — and every layer would look self-consistent while it happened.
 */

/** A form with every field authored, which is what makes a silent rename show up as a failure. */
function fullyAuthoredForm(): HomeContentForm {
  return {
    ...createDefaultHomeContentForm(),
    ctaBadge: 'Go',
    ctaPrimaryCta: { href: '/pricing', label: 'Pricing' },
    ctaSecondaryCta: { href: 'https://example.com/support', label: 'Support' },
    ctaSubtitle: 'Closing subtitle',
    ctaTitle: 'Closing title',
    downloadSubtitle: 'Download subtitle',
    downloadTitle: 'Download title',
    featureBadge: 'Why',
    featureItems: [
      { description: 'First description', icon: 'shield', title: 'First feature' },
      { description: 'Second description', icon: '', title: 'Second feature' },
    ],
    featureSubtitle: 'Feature subtitle',
    featureTitle: 'Feature title',
    heroBadge: 'New',
    heroPrimaryCta: { href: '/docs', label: 'Docs' },
    heroSecondaryCta: { href: 'https://example.com', label: 'Site' },
    heroStats: [
      { label: 'Vendors', value: '12' },
      { label: 'Uptime', value: '99%' },
    ],
    heroSubtitle: 'Hero subtitle',
    heroTitleHighlight: 'anything',
    heroTitleLead: 'Route',
    modalityBadge: 'Every',
    modalityItems: [
      { icon: 'bolt', items: 'OpenAI GPT-4o\nAnthropic Claude', title: 'Chat' },
      { icon: '', items: 'Seedream', title: 'Images' },
    ],
    modalitySubtitle: 'Modality subtitle',
    modalityTitleHighlight: 'Capability',
    modalityTitleLead: 'Every',
    productName: 'CloudRouter',
    sections: {
      cta: true,
      download: false,
      features: true,
      hero: true,
      models: true,
      modalities: false,
    },
    tagline: 'One gateway for every model',
    version: '9.9.9',
  };
}

test('the console and the homepage agree on the catalog generation they publish', () => {
  // The console mirrors the constant instead of importing it — the landing package is not a
  // dependency of a console package — so the mirror is pinned here.
  assert.equal(DOWNLOAD_CATALOG_SCHEMA_VERSION, HOMEPAGE_SCHEMA_VERSION);
});

test('an untouched homepage form publishes nothing at all', () => {
  const payload = toHomeContentPayload(createDefaultHomeContentForm());

  // An operator who opens the page and saves without typing must not pin the landing page to the
  // console's own wording: `{}` is the document the runtime reads as "publish the bundled copy".
  assert.deepEqual(payload, {});
  assert.deepEqual(readHomeContent(payload), {});
});

test('every authored homepage value survives the runtime reader', () => {
  const content = readHomeContent(toHomeContentPayload(fullyAuthoredForm()));

  assert.equal(content.productName, 'CloudRouter');
  assert.equal(content.tagline, 'One gateway for every model');
  assert.equal(content.version, '9.9.9');

  assert.equal(content.hero?.badge, 'New');
  assert.equal(content.hero?.titleLead, 'Route');
  assert.equal(content.hero?.titleHighlight, 'anything');
  assert.equal(content.hero?.subtitle, 'Hero subtitle');
  assert.deepEqual(content.hero?.primaryCta, { href: '/docs', label: 'Docs' });
  assert.deepEqual(content.hero?.secondaryCta, { href: 'https://example.com', label: 'Site' });
  assert.deepEqual(content.hero?.stats, [
    { id: 'stat-1', label: 'Vendors', value: '12' },
    { id: 'stat-2', label: 'Uptime', value: '99%' },
  ]);

  assert.equal(content.modalities?.badge, 'Every');
  assert.equal(content.modalities?.titleLead, 'Every');
  assert.equal(content.modalities?.titleHighlight, 'Capability');
  assert.equal(content.modalities?.subtitle, 'Modality subtitle');
  assert.deepEqual(content.modalities?.items, [
    { icon: 'bolt', id: 'modality-1', items: ['OpenAI GPT-4o', 'Anthropic Claude'], title: 'Chat' },
    { id: 'modality-2', items: ['Seedream'], title: 'Images' },
  ]);

  assert.equal(content.features?.badge, 'Why');
  assert.equal(content.features?.title, 'Feature title');
  assert.equal(content.features?.subtitle, 'Feature subtitle');
  assert.deepEqual(content.features?.items, [
    { description: 'First description', icon: 'shield', id: 'feature-1', title: 'First feature' },
    { description: 'Second description', id: 'feature-2', title: 'Second feature' },
  ]);

  assert.deepEqual(content.download, { subtitle: 'Download subtitle', title: 'Download title' });
  assert.equal(content.cta?.badge, 'Go');
  assert.equal(content.cta?.title, 'Closing title');
  assert.equal(content.cta?.subtitle, 'Closing subtitle');
  assert.deepEqual(content.cta?.primaryCta, { href: '/pricing', label: 'Pricing' });
  assert.deepEqual(content.cta?.secondaryCta, { href: 'https://example.com/support', label: 'Support' });
  assert.deepEqual(content.sections, fullyAuthoredForm().sections);
});

test('the console reads back exactly the document it authored', () => {
  // The other half of the pairing: a value that survives into the runtime but comes back changed
  // would silently rewrite itself on the next save.
  assert.deepEqual(readHomeContentForm(toHomeContentPayload(fullyAuthoredForm())), fullyAuthoredForm());
});

test('hiding a region is stored, and showing every region stores nothing', () => {
  const hidden = toHomeContentPayload({
    ...createDefaultHomeContentForm(),
    sections: { ...createDefaultHomeContentForm().sections, cta: false },
  });
  assert.deepEqual(hidden, { sections: { ...createDefaultHomeContentForm().sections, cta: false } });

  // All six flags on is the runtime's own default, so writing them would make an untouched
  // deployment look authored.
  const shown = toHomeContentPayload(createDefaultHomeContentForm());
  assert.equal('sections' in shown, false);
});

test('a half-written entry is kept by the console and skipped by the homepage', () => {
  const halfLink = { ...createDefaultHomeContentForm(), heroPrimaryCta: { href: '/docs', label: '' } };
  const halfStat = { ...createDefaultHomeContentForm(), heroStats: [{ label: '', value: '12' }] };
  const halfFeature = { ...createDefaultHomeContentForm(), featureItems: [{ description: '', icon: '', title: 'Only a title' }] };
  const halfModality = { ...createDefaultHomeContentForm(), modalityItems: [{ icon: '', items: '', title: 'Only a title' }] };

  // The warning list is what the console shows in place of silently discarding the operator's
  // typing, so the two must agree about which entries are incomplete.
  assert.deepEqual(findIncompleteHomeContent(halfLink), ['hero.primaryCta']);
  assert.deepEqual(findIncompleteHomeContent(halfStat), ['hero.stats']);
  assert.deepEqual(findIncompleteHomeContent(halfFeature), ['features.items']);
  assert.deepEqual(findIncompleteHomeContent(halfModality), ['modalities.items']);

  // And the warning is accurate: the runtime draws none of them, so nothing broken is published
  // while the operator finishes the entry.
  assert.equal(readHomeContent(toHomeContentPayload(halfLink)).hero, undefined);
  assert.equal(readHomeContent(toHomeContentPayload(halfStat)).hero, undefined);
  assert.equal(readHomeContent(toHomeContentPayload(halfFeature)).features, undefined);
  assert.equal(readHomeContent(toHomeContentPayload(halfModality)).modalities, undefined);

  // A complete entry is not warned about.
  assert.deepEqual(findIncompleteHomeContent(fullyAuthoredForm()), []);
});

test('the console bounds authored collections the way the runtime bounds its rendering', () => {
  const rows = Array.from({ length: HOME_MAX_COLLECTION_ROWS + 6 }, (_, index) => ({
    label: `label ${index}`,
    value: `value ${index}`,
  }));
  const lines = Array.from({ length: HOME_MAX_LIST_ITEMS + 5 }, (_, index) => `model-${index}`).join('\n');

  const payload = toHomeContentPayload({
    ...createDefaultHomeContentForm(),
    heroStats: rows,
    modalityItems: [{ icon: '', items: lines, title: 'Chat' }],
  });
  const content = readHomeContent(payload);

  // Both halves of the bound are pinned: that the console stops at the runtime's limit, and that
  // the runtime's limit is the number the console used. A bound on one side only would leave the
  // tail of a long list visible in the console and absent from the page.
  assert.equal(content.hero?.stats?.length, HOME_MAX_COLLECTION_ROWS);
  assert.equal(content.modalities?.items?.[0]?.items?.length, HOME_MAX_LIST_ITEMS);
  assert.equal(readHomeContentForm(payload).heroStats.length, HOME_MAX_COLLECTION_ROWS);
  assert.equal(readHomeContentForm(payload).modalityItems[0].items.split('\n').length, HOME_MAX_LIST_ITEMS);
});

test('every homepage region the console switches is a region the runtime reads', () => {
  // Every code the console offers, with one of them switched off: the runtime drops a flag it does
  // not recognise, so a region that exists only in the console would be switchable here and
  // unreadable there — and the two key sets would differ.
  const offered = Object.fromEntries(HOME_SECTIONS.map((section) => [section.code, true]));
  const sections = readHomeContent({ sections: { ...offered, hero: false } }).sections;

  assert.ok(sections, 'the runtime did not read the sections document');
  assert.equal(sections.hero, false);
  assert.deepEqual(Object.keys(sections).sort(), HOME_SECTIONS.map((section) => section.code).sort());
});

/**
 * Catalog documents, already parsed, so the verdicts can be compared directly.
 *
 * Deliberately mixed: an invalid *envelope* (what the console checks) and a valid envelope holding
 * cards the runtime would still refuse to draw. The console reports the envelope only, which is why
 * the case below is asserted to agree rather than to be stricter.
 */
const CATALOG_FIXTURES: ReadonlyArray<{ label: string; value: unknown }> = [
  { label: 'a string', value: 'catalog' },
  { label: 'an array', value: [] },
  { label: 'an empty object', value: {} },
  {
    label: 'a stale schemaVersion',
    value: {
      cards: [{ id: 'a' }],
      product: { id: 'cloudrouter', name: 'CloudRouter', version: '1.0.0' },
      schemaVersion: '2020-01-01.sdkwork-download-catalog.v0',
    },
  },
  { label: 'a missing product', value: { cards: [{ id: 'a' }] } },
  {
    label: 'a product without a version',
    value: { cards: [{ id: 'a' }], product: { id: 'cloudrouter', name: 'CloudRouter' } },
  },
  {
    label: 'no cards',
    value: { product: { id: 'cloudrouter', name: 'CloudRouter', version: '1.0.0' }, cards: [] },
  },
  {
    label: 'cards that are not an array',
    value: { cards: 'soon', product: { id: 'cloudrouter', name: 'CloudRouter', version: '1.0.0' } },
  },
  {
    label: 'an envelope with no declared schemaVersion',
    value: { cards: [{ id: 'a' }], product: { id: 'cloudrouter', name: 'CloudRouter', version: '1.0.0' } },
  },
  { label: 'the catalog this repository ships', value: cloudRouterDownloadCatalog },
];

test('the console and the homepage accept exactly the same download catalogs', () => {
  const verdicts = CATALOG_FIXTURES.map((fixture) => ({
    console: checkDownloadCatalog(JSON.stringify(fixture.value)).ok,
    homepage: readRuntimeDownloadCatalog(fixture.value) !== undefined,
    label: fixture.label,
  }));

  const disagreements = verdicts
    .filter((verdict) => verdict.console !== verdict.homepage)
    .map((verdict) => `${verdict.label}: console=${verdict.console} homepage=${verdict.homepage}`);
  assert.deepEqual(disagreements, [], 'the console would publish a catalog the homepage ignores');

  // Both directions are exercised, so a validator that always answered the same thing would fail
  // rather than agree with a reader that always answered the same thing.
  assert.ok(verdicts.some((verdict) => verdict.console), 'no fixture is acceptable');
  assert.ok(verdicts.some((verdict) => !verdict.console), 'no fixture is rejected');
});

test('the console rejects text that is not JSON at all', () => {
  const malformed = checkDownloadCatalog('{ "cards": [ }');
  assert.equal(malformed.ok, false);
  assert.ok(malformed.problems.length > 0, 'a rejected document must say why');

  // A blank box is not a mistake: it is the state a deployment that never published a catalog is
  // in, and it has to keep the homepage on the catalog built into the application.
  assert.deepEqual(checkDownloadCatalog(''), { ok: true, problems: [] });
  assert.deepEqual(checkDownloadCatalog('   \n'), { ok: true, problems: [] });
  assert.equal(readRuntimeDownloadCatalog({}), undefined);
});

test('a pasted catalog is published as the document the homepage renders, and as stable text', () => {
  const text = JSON.stringify(cloudRouterDownloadCatalog, null, 2);
  const payload = toDownloadCatalogPayload(text);

  assert.notEqual(readRuntimeDownloadCatalog(payload), undefined);
  // Canonical text, so "unsaved changes" compares formatting-stable strings: the value the server
  // echoes back is serialised the same way as the value that was typed.
  assert.equal(readDownloadCatalogText(payload), `${text}\n`);
  assert.equal(readDownloadCatalogText(payload), readDownloadCatalogText(JSON.parse(text)));
  // An empty box publishes an empty document, which the homepage reads as "not published".
  assert.deepEqual(toDownloadCatalogPayload(''), {});
  assert.equal(readDownloadCatalogText({}), '');
  assert.equal(readDownloadCatalogText(undefined), '');
});

test('an unparseable catalog is refused rather than sent as an empty document', () => {
  // Quietly clearing the catalog would publish the bundled one over a document the operator was
  // still editing, which is the worst outcome available; the page blocks the save instead.
  assert.throws(() => toDownloadCatalogPayload('{'), SyntaxError);
  assert.throws(() => toDownloadCatalogPayload('[1,2]'), /must be a JSON object/u);
});

/**
 * The structured download editor's form model, fully authored the way the structured editor
 * writes it: every runtime-supported field filled, including an uploaded Drive installer and a
 * preserved extra the editor does not model.
 */
function fullyAuthoredDownloadCatalogForm(): DownloadCatalogForm {
  const action = (overrides: Partial<DownloadCatalogActionFields>): DownloadCatalogActionFields => ({
    ...createEmptyDownloadCatalogAction(),
    id: `action-${Math.random().toString(36).slice(2, 8)}`,
    ...overrides,
  });
  const desktopCard: DownloadCatalogCardFields = {
    ...createEmptyDownloadCatalogCard(),
    id: 'card-desktop',
    title: 'Cloud Router Desktop',
    description: 'For developers and local environments.',
    kind: 'desktop',
    icon: 'desktop',
    tone: 'brand',
    badge: 'New',
    primaryActionStrategy: 'detected-platform',
    actions: [
      action({
        id: 'desktop-windows-x64',
        label: 'Windows x64',
        href: 'https://example.com/releases/cloudrouter-windows-x64-1.0.0.msi',
        platform: 'windows',
        architecture: 'x64',
        fileName: 'cloudrouter-windows-x64-1.0.0.msi',
        version: '1.0.0',
        releaseTag: 'v1.0.0',
        sha256: 'a'.repeat(64),
        sizeBytes: '184320',
        extra: { ariaLabel: 'Download Cloud Router Desktop for Windows x64' },
      }),
      action({
        id: 'desktop-macos-uploaded',
        label: 'macOS Apple silicon',
        href: 'drive://spaces/space-1/nodes/node-9',
        drive: { nodeId: 'node-9', shareToken: 'token-9', spaceId: 'space-1' },
        platform: 'macos',
        architecture: 'arm64',
        fileName: 'cloudrouter-macos-arm64-1.0.0.pkg',
        version: '1.0.0',
        sizeBytes: '2015232',
      }),
    ],
  };
  const mobileCard: DownloadCatalogCardFields = {
    ...createEmptyDownloadCatalogCard(),
    id: 'card-mobile',
    title: 'Cloud Router Mobile',
    description: 'Track routing health from a phone.',
    kind: 'mobile',
    actions: [
      action({
        id: 'mobile-ios',
        label: 'iOS',
        href: '',
        platform: 'ios',
        disabled: true,
        unavailableLabel: 'iOS coming soon',
      }),
    ],
  };
  return {
    ...createEmptyDownloadCatalogForm(),
    generatedAt: '1.0.0.release',
    productId: 'sdkwork-cloudrouter',
    productName: 'SdkWork CloudRouter',
    productVersion: '1.0.0',
    productChannel: 'stable',
    productReleaseTag: 'v1.0.0',
    productReleaseUrl: 'https://example.com/releases/v1.0.0',
    cards: [desktopCard, mobileCard],
  };
}

test('an untouched download catalog form publishes nothing at all', () => {
  assert.equal(toDownloadCatalogText(createEmptyDownloadCatalogForm()), '');
  assert.deepEqual(readDownloadCatalogForm(JSON.parse('{}')), createEmptyDownloadCatalogForm());
});

test('every authored download catalog value survives the runtime reader', () => {
  const form = fullyAuthoredDownloadCatalogForm();
  const text = toDownloadCatalogText(form);
  const payload = JSON.parse(text);

  // The console may only publish what the real runtime reader accepts — the same guarantee the
  // homepage editor's tests assert, now for the structured editor's output. The reader is the
  // first hop in the published chain and stamps the schemaVersion the console deliberately omits.
  const stamped = readRuntimeDownloadCatalog(payload);
  assert.notEqual(stamped, undefined);
  const catalog = createCloudRouterDownloadCatalog(stamped);

  assert.deepEqual(catalog.product, {
    channel: 'stable',
    id: 'sdkwork-cloudrouter',
    name: 'SdkWork CloudRouter',
    releaseTag: 'v1.0.0',
    releaseUrl: 'https://example.com/releases/v1.0.0',
    version: '1.0.0',
  });
  assert.equal(catalog.generatedAt, '1.0.0.release');
  assert.deepEqual(catalog.cards.map((card) => card.id), ['card-desktop', 'card-mobile']);

  const [desktop, mobile] = catalog.cards;
  assert.equal(desktop.title, 'Cloud Router Desktop');
  assert.equal(desktop.badge, 'New');
  assert.equal(desktop.primaryActionStrategy, 'detected-platform');
  assert.deepEqual(desktop.actions.map((entry) => entry.id), ['desktop-windows-x64', 'desktop-macos-uploaded']);
  const [windows, macos] = desktop.actions;
  assert.equal(windows.href, 'https://example.com/releases/cloudrouter-windows-x64-1.0.0.msi');
  assert.equal(windows.architecture, 'x64');
  assert.equal(windows.sizeBytes, 184320);
  assert.equal(windows.sha256, 'a'.repeat(64));
  assert.equal(windows.ariaLabel, 'Download Cloud Router Desktop for Windows x64');
  assert.equal(windows.disabled, false);
  // The uploaded Drive action normalizes with an empty href — the runtime's href rules only
  // accept http(s) URLs — and stays disabled until the landing page resolves its reference.
  assert.equal(macos.href, '');
  assert.equal(macos.disabled, true);
  assert.equal(macos.fileName, 'cloudrouter-macos-arm64-1.0.0.pkg');

  assert.equal(mobile.actions[0].disabled, true);
  assert.equal(mobile.actions[0].unavailableLabel, 'iOS coming soon');

  // And the console reads back exactly the document it authored, so an opened-and-saved catalog
  // is not flagged as an edit.
  assert.deepEqual(readDownloadCatalogForm(payload), form);
});

test('the runtime reads the same drive references the structured editor publishes', () => {
  const payload = JSON.parse(toDownloadCatalogText(fullyAuthoredDownloadCatalogForm()));
  const refs = readDownloadActionDriveRefs(payload);

  assert.equal(refs.size, 1);
  assert.deepEqual(refs.get('card-desktop/desktop-macos-uploaded'), {
    nodeId: 'node-9',
    shareToken: 'token-9',
    spaceId: 'space-1',
  });

  // Resolution flips the previously disabled action on, with the fresh presigned URL in place of
  // the inert drive:// mirror. The stamp hop mirrors what the home content runtime does before
  // the panel sees the catalog.
  const catalog = createCloudRouterDownloadCatalog(readRuntimeDownloadCatalog(payload));
  const resolved = applyResolvedDownloadUrls(catalog.cards, new Map([
    ['card-desktop/desktop-macos-uploaded', 'https://storage.example.com/signed?X-Amz-Expires=3600'],
  ]));
  const macos = resolved[0].actions.find((action) => action.id === 'desktop-macos-uploaded');
  assert.equal(macos?.disabled, false);
  assert.equal(macos?.href, 'https://storage.example.com/signed?X-Amz-Expires=3600');

  // Without a resolution the action stays disabled — a catalog must never render a link that
  // cannot be followed.
  const unresolved = applyResolvedDownloadUrls(catalog.cards, new Map());
  assert.equal(
    unresolved[0].actions.find((action) => action.id === 'desktop-macos-uploaded')?.disabled,
    true,
  );
});

test('the structured editor keeps a half-written catalog instead of dropping it', () => {
  const form = fullyAuthoredDownloadCatalogForm();
  const desktop = form.cards[0];
  desktop.actions.push({
    ...createEmptyDownloadCatalogAction(),
    id: '',
    label: '',
    href: '',
  });
  form.cards[1].title = '';
  form.cards[1].actions = [];

  const warnings = findIncompleteDownloadCatalog(form);
  assert.deepEqual([...warnings].sort(), [
    'action.identity',
    'action.target',
    'card.actions.missing',
    'card.identity',
  ]);

  // Half-written rows are kept in the document (the operator sees their typing, the runtime skips
  // them) — the same convention the homepage editor uses for half-written links. A completely
  // blank row has nothing to keep, so it serialises away like an untouched homepage row does.
  const payload = JSON.parse(toDownloadCatalogText(form));
  assert.equal(readDownloadActionDriveRefs(payload).size, 1);
  assert.equal(payload.cards[1].actions, undefined);
  assert.equal(payload.cards[0].actions.length, 2);
});

test('the structured editor bounds its collections the way the runtime renders them', () => {
  const form = createEmptyDownloadCatalogForm();
  const bigCard = createEmptyDownloadCatalogCard();
  bigCard.id = 'card-big';
  bigCard.actions = Array.from(
    { length: DOWNLOAD_MAX_ACTIONS_PER_CARD + 6 },
    () => createEmptyDownloadCatalogAction(),
  );
  form.cards = [bigCard];
  form.cards.push(...Array.from(
    { length: DOWNLOAD_MAX_CARDS + 3 },
    (_, index) => ({ ...createEmptyDownloadCatalogCard(), id: `card-extra-${index}` }),
  ));

  // Both halves of the bound are pinned: the console stops at its own limit, and reading a
  // document back into the editor stops at the same limit.
  const payload = JSON.parse(toDownloadCatalogText(form));
  assert.equal(payload.cards.length, DOWNLOAD_MAX_CARDS);
  assert.equal(payload.cards[0].actions.length, DOWNLOAD_MAX_ACTIONS_PER_CARD);
  assert.equal(readDownloadCatalogForm(payload).cards.length, DOWNLOAD_MAX_CARDS);
  assert.equal(readDownloadCatalogForm(payload).cards[0].actions.length, DOWNLOAD_MAX_ACTIONS_PER_CARD);
});

test('the console and the homepage agree about a structured catalog with uploaded files', () => {
  const text = toDownloadCatalogText(fullyAuthoredDownloadCatalogForm());

  // The save guard still passes on the structured editor's output, and the clear-button
  // semantics survive: an empty editor serialises to the unpublished state.
  assert.equal(checkDownloadCatalog(text).ok, true);
  assert.equal(checkDownloadCatalog(toDownloadCatalogText(createEmptyDownloadCatalogForm())).ok, true);
  assert.equal(readDownloadCatalogText(JSON.parse(text)), text);
});

test('the structured editor seeds itself from the catalog that is already live', () => {
  // Nothing published: the bundled catalog seeds the editor, because that is what the homepage
  // is rendering right now and the operator asked to modify it rather than re-type it.
  const seeded = readInitialDownloadCatalogForm('', cloudRouterDownloadCatalog);
  assert.notEqual(seeded, null);
  assert.deepEqual(seeded, readDownloadCatalogForm(cloudRouterDownloadCatalog));
  assert.equal(seeded?.cards.length, 3);
  assert.deepEqual(seeded?.cards.map((card) => card.id), [
    'cloud-router-desktop',
    'cloud-router-server',
    'cloud-router-mobile',
  ]);

  // A published document always wins over the bundled seed.
  const published = JSON.parse(toDownloadCatalogText(fullyAuthoredDownloadCatalogForm()));
  assert.deepEqual(
    readInitialDownloadCatalogForm(JSON.stringify(published), cloudRouterDownloadCatalog),
    readDownloadCatalogForm(published),
  );

  // Without a composition-supplied seed the editor starts from a minimal skeleton.
  const bare = readInitialDownloadCatalogForm('');
  assert.equal(bare?.cards.length, 1);

  // Unparseable text blocks the structured editor instead of guessing.
  assert.equal(readInitialDownloadCatalogForm('{ broken'), null);
});

test('the bundled catalog survives a structured open-edit-save cycle unchanged', () => {
  // The operator opens the editor (seeded with the bundled catalog), changes nothing structural,
  // and saves once: the published document must render exactly like the bundled one — same
  // cards, same actions, same hrefs — not a transcription that lost a field.
  const seeded = readInitialDownloadCatalogForm('', cloudRouterDownloadCatalog);
  const text = toDownloadCatalogText(seeded);
  const catalog = createCloudRouterDownloadCatalog(readRuntimeDownloadCatalog(JSON.parse(text)));

  const bundled = createCloudRouterDownloadCatalog(cloudRouterDownloadCatalog);
  assert.deepEqual(catalog.cards, bundled.cards);
  assert.deepEqual(catalog.product, bundled.product);

  // And the round trip is stable: re-opening the saved document reads back the same form.
  assert.deepEqual(readInitialDownloadCatalogForm(text, cloudRouterDownloadCatalog), seeded);
});

test('per-card warning codes match the aggregate catalog warnings', () => {  const form = fullyAuthoredDownloadCatalogForm();
  // Every authored card is clean.
  assert.deepEqual(findDownloadCatalogCardWarningCodes(form.cards[0]), []);
  assert.deepEqual(findDownloadCatalogCardWarningCodes(form.cards[1]), []);
  assert.deepEqual(findIncompleteDownloadCatalog(form), []);

  // Break one card in three ways; its tab must light up and the aggregate must agree. The mobile
  // card's only row ships deliberately disabled, so it is re-enabled first — a disabled row is
  // allowed to have no target.
  form.cards[1].title = '';
  form.cards[1].actions[0].label = '';
  form.cards[1].actions[0].disabled = false;
  form.cards[1].actions[0].href = '';
  form.cards[1].actions[0].drive = { nodeId: '', shareToken: '', spaceId: '' };
  const cardWarnings = findDownloadCatalogCardWarningCodes(form.cards[1]);
  assert.deepEqual([...cardWarnings].sort(), ['action.identity', 'action.target', 'card.identity']);

  const aggregate = findIncompleteDownloadCatalog(form);
  for (const code of cardWarnings) {
    assert.ok(aggregate.includes(code), `aggregate warnings lost ${code}`);
  }
  // The clean card contributes nothing.
  assert.deepEqual(findDownloadCatalogCardWarningCodes(form.cards[0]), []);

  // Per-installer codes are what the sidebar dots render, and they read the same rules.
  const brokenAction = form.cards[1].actions[0];
  assert.deepEqual(
    [...findDownloadCatalogActionWarningCodes(brokenAction)].sort(),
    ['action.identity', 'action.target'],
  );
  const cleanAction = form.cards[0].actions[0];
  assert.deepEqual(findDownloadCatalogActionWarningCodes(cleanAction), []);
  // A disabled row without a target is a deliberate hidden entry, not a warning.
  const disabledAction = form.cards[1].actions[0];
  disabledAction.disabled = true;
  assert.deepEqual(findDownloadCatalogActionWarningCodes(disabledAction), ['action.identity']);
});

test('a hidden card round-trips and parks its not-ready warnings', () => {
  const form = fullyAuthoredDownloadCatalogForm();
  const mobile = form.cards[1];
  mobile.hidden = true;

  // Write-side rule: only the deliberate hide is stored; a visible card writes no flag.
  const payload = JSON.parse(toDownloadCatalogText(form));
  assert.equal(payload.cards[1].hidden, true);
  assert.equal('hidden' in payload.cards[0], false);
  assert.deepEqual(readDownloadCatalogForm(payload), form);

  // A parked edition excuses the not-ready signals (no installers, installers without targets)
  // the same way a disabled installer excuses a missing target; identity still warns.
  mobile.actions = [];
  assert.deepEqual(findDownloadCatalogCardWarningCodes(mobile), []);
  mobile.title = '';
  assert.deepEqual(findDownloadCatalogCardWarningCodes(mobile), ['card.identity']);
  assert.deepEqual(findIncompleteDownloadCatalog(form), ['card.identity']);

  // Re-showing the card restores every warning.
  mobile.hidden = false;
  const aggregate = findIncompleteDownloadCatalog(form);
  assert.ok(aggregate.includes('card.identity'));
  assert.ok(aggregate.includes('card.actions.missing'));
});

test('HarmonyOS is available to the structured editor and survives the runtime reader', () => {
  // The console's platform dropdown is generated from the shared constant, so the enum must
  // carry harmonyos — and the runtime normalizer must accept what the console writes.
  assert.ok(
    (DOWNLOAD_CATALOG_PLATFORMS as readonly string[]).includes('harmonyos'),
    'the editor platform options must include harmonyos',
  );

  const form = fullyAuthoredDownloadCatalogForm();
  const harmony = {
    ...createEmptyDownloadCatalogAction(),
    id: 'mobile-harmonyos',
    label: 'HarmonyOS',
    href: 'https://example.com/cloudrouter-harmonyos-1.0.0.hap',
    platform: 'harmonyos' as const,
  };
  form.cards[1].actions = [harmony];

  const payload = JSON.parse(toDownloadCatalogText(form));
  const catalog = createCloudRouterDownloadCatalog(readRuntimeDownloadCatalog(payload));
  const action = catalog.cards[1].actions.find((entry) => entry.id === 'mobile-harmonyos');
  assert.equal(action?.platform, 'harmonyos');
  assert.equal(action?.disabled, false);
  // And the console reads its own authored row back unchanged.
  assert.deepEqual(readDownloadCatalogForm(payload), form);
});
