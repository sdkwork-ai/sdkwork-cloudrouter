import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DOWNLOAD_CATALOG_SCHEMA_VERSION,
  HOME_MAX_COLLECTION_ROWS,
  HOME_MAX_LIST_ITEMS,
  HOME_SECTIONS,
  checkDownloadCatalog,
  createDefaultHomeContentForm,
  findIncompleteHomeContent,
  readDownloadCatalogText,
  readHomeContentForm,
  toDownloadCatalogPayload,
  toHomeContentPayload,
  type HomeContentForm,
} from './packages/sdkwork-cloudrouter-pc-admin-site/src/siteContentFields.ts';
import { readHomeContent } from './packages/sdkwork-cloudrouter-pc-home/src/content/home-content.ts';
import {
  cloudRouterDownloadCatalog,
  DOWNLOAD_CATALOG_SCHEMA_VERSION as HOMEPAGE_SCHEMA_VERSION,
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
