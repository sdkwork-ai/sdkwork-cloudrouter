const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');
const { createRequire } = require('node:module');

const portalRoot = __dirname;
const portalRequire = createRequire(path.join(portalRoot, 'package.json'));
const React = portalRequire('react');
const { renderToStaticMarkup } = portalRequire('react-dom/server');
const { MemoryRouter, Route, Routes } = portalRequire('react-router-dom');
const { I18nextProvider } = portalRequire('react-i18next');
const i18next = portalRequire('i18next');
const ts = portalRequire('typescript');

const PRIVATE_PRICING_TOKENS = [
  'lowestUpstreamCostUnitPrice',
  'customerUnitPrice',
  'grossMarginPerUnit',
  'pricingPlanCode',
  'groupCode',
];

function stripAnimationProps(props) {
  const {
    animate,
    exit,
    initial,
    layout,
    transition,
    variants,
    viewport,
    whileHover,
    whileInView,
    whileTap,
    ...domProps
  } = props;
  return domProps;
}

function createMotionShim() {
  const motion = new Proxy({}, {
    get(_target, elementName) {
      if (elementName === '__esModule') {
        return true;
      }
      if (typeof elementName !== 'string') {
        return undefined;
      }
      return React.forwardRef((props, ref) => React.createElement(
        elementName,
        { ...stripAnimationProps(props), ref },
        props.children,
      ));
    },
  });
  return {
    AnimatePresence: ({ children }) => React.createElement(React.Fragment, null, children),
    motion,
  };
}

function createRechartsShim() {
  function chartComponent(name) {
    return () => React.createElement('div', { 'data-ssr-chart': name });
  }
  return {
    Area: chartComponent('Area'),
    AreaChart: chartComponent('AreaChart'),
    CartesianGrid: chartComponent('CartesianGrid'),
    Line: chartComponent('Line'),
    LineChart: chartComponent('LineChart'),
    ResponsiveContainer: chartComponent('ResponsiveContainer'),
    Tooltip: chartComponent('Tooltip'),
    XAxis: chartComponent('XAxis'),
    YAxis: chartComponent('YAxis'),
  };
}

function createCommonsShim() {
  return {
    CollapsibleSection: ({ title, children }) => React.createElement(
      'section',
      { 'data-ssr-section': String(title) },
      React.createElement('h2', null, title),
      children,
    ),
    CopyButton: ({ label, title }) => React.createElement(
      'button',
      { type: 'button', title: title ?? label ?? 'Copy' },
      label ?? title ?? 'Copy',
    ),
    ensureSdkworkApiSuccess: () => undefined,
    FilterCheckbox: ({ checked, icon, label }) => React.createElement(
      'button',
      { 'aria-pressed': checked ? 'true' : 'false', type: 'button' },
      icon,
      label,
    ),
    FilterSidebar: ({ children }) => React.createElement('aside', null, children),
    getClawRouterAppSdkClient: () => ({
      router: {
        fetchModels: async () => ({ data: { items: [] }, success: true }),
      },
    }),
  };
}

function installSsrRequireHooks() {
  const originalLoad = Module._load;
  const shims = new Map([
    ['motion/react', createMotionShim()],
    ['recharts', createRechartsShim()],
    ['sdkwork-clawrouter-pc-commons', createCommonsShim()],
  ]);

  Module._load = function loadForSsrSmoke(request, parent, isMain) {
    if (shims.has(request)) {
      return shims.get(request);
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  for (const extension of ['.ts', '.tsx']) {
    require.extensions[extension] = function compileTypeScript(module, filename) {
      const source = readFileSync(filename, 'utf8');
      const output = ts.transpileModule(source, {
        compilerOptions: {
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
          jsx: ts.JsxEmit.ReactJSX,
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
        fileName: filename,
        reportDiagnostics: true,
      });
      const diagnostics = output.diagnostics?.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error) ?? [];
      if (diagnostics.length > 0) {
        const message = ts.formatDiagnosticsWithColorAndContext(diagnostics, {
          getCanonicalFileName: (fileName) => fileName,
          getCurrentDirectory: () => portalRoot,
          getNewLine: () => '\n',
        });
        throw new Error(message);
      }
      module._compile(output.outputText, filename);
    };
  }
}

installSsrRequireHooks();

const { ModelDetails } = require('./packages/sdkwork-clawrouter-pc-models/src/pages/ModelDetails.tsx');
const { Models } = require('./packages/sdkwork-clawrouter-pc-models/src/pages/Models.tsx');

function createTestI18n() {
  const instance = i18next.createInstance();
  instance.init({
    fallbackLng: 'en',
    initImmediate: false,
    interpolation: { escapeValue: false },
    resources: {
      en: {
        translation: {
          models: {
            backToModels: 'Back to Models',
            cachedIn: 'Cached Input',
            capabilities: 'Capabilities',
            categories: 'Categories',
            clearFilters: 'Clear filters',
            context: 'Context',
            flatPrice: 'Flat price',
            groups: 'Groups',
            input: 'Input',
            latency: 'Latency',
            modality: 'Modality',
            noResults: 'No models found',
            noResultsDesc: 'Try clearing filters.',
            output: 'Output',
            pricing: 'Pricing',
            provider: 'Provider',
            providerSearch: 'Search providers',
            search: 'Search models',
            throughput: 'Throughput',
            viewGrid: 'Grid view',
            viewList: 'List view',
            details: {
              apiExample: 'API Example',
              capabilityIntro: 'Capability Introduction',
              copied: 'Copied',
              copy: 'Copy',
              tryNow: 'Try in Playground',
              useCases: 'Use Cases',
            },
            sort: {
              contextLength: 'Context Length',
              popularity: 'Popularity',
              priceHighToLow: 'Price: High to Low',
              priceLowToHigh: 'Price: Low to High',
            },
          },
        },
      },
    },
  });
  return instance;
}

function renderWithRouter(initialEntry, element) {
  return renderToStaticMarkup(
    React.createElement(
      I18nextProvider,
      { i18n: createTestI18n() },
      React.createElement(MemoryRouter, { initialEntries: [initialEntry] }, element),
    ),
  );
}

function assertPublicModelHtml(html) {
  for (const token of PRIVATE_PRICING_TOKENS) {
    assert.doesNotMatch(html, new RegExp(token), `SSR output must not expose private pricing token ${token}`);
  }
}

test('models route SSR renders the SDK-backed shell without exposing private pricing fields', () => {
  const html = renderWithRouter('/models', React.createElement(Models));

  assert.match(html, /Categories/);
  assert.match(html, /Groups/);
  assert.match(html, /Search models/);
  assert.match(html, /No models found/);
  assert.doesNotMatch(html, /GPT-4o mini/);
  assert.doesNotMatch(html, /GPT-5\.5 Pro/);
  assert.doesNotMatch(html, /reference \/ 1M tokens/);
  assertPublicModelHtml(html);
});

test('model detail route SSR renders no stale static catalog before app SDK hydration', () => {
  const html = renderWithRouter(
    '/models/openai%2Fgpt-5.5-pro',
    React.createElement(
      Routes,
      null,
      React.createElement(Route, {
        element: React.createElement(ModelDetails),
        path: '/models/:modelId',
      }),
    ),
  );

  assert.equal(html, '');
  assertPublicModelHtml(html);
});

test('model detail encoded id route SSR matches the catalog card navigation path', () => {
  const html = renderWithRouter(
    '/models/openai%2Fgpt-5.5-pro',
    React.createElement(
      Routes,
      null,
      React.createElement(Route, {
        element: React.createElement(ModelDetails),
        path: '/models/:id',
      }),
    ),
  );

  assert.equal(html, '');
  assertPublicModelHtml(html);
});
