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
const { MemoryRouter } = portalRequire('react-router-dom');
const ts = portalRequire('typescript');

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

function createI18nShim() {
  const translations = {
    'common.actions.authorization': 'Authorization',
    'common.actions.body': 'Body',
    'common.actions.bulkEdit': 'Bulk Edit',
    'common.actions.copyUrl': 'Copy URL',
    'common.actions.headers': 'Headers',
    'common.actions.params': 'Params',
    'common.actions.saveResponse': 'Save Response',
    'common.actions.send': 'Send',
  };
  return {
    useTranslation: () => ({
      t: (key, fallback) => fallback ?? translations[key] ?? key,
    }),
  };
}

function createCommonsShim() {
  return {
    API_BASE_URL: 'https://api.example.test',
    CopyButton: ({ label, title }) => React.createElement(
      'button',
      { type: 'button', title: title ?? label ?? 'Copy' },
      label ?? title ?? 'Copy',
    ),
    JsonSyntaxHighlight: ({ value }) => React.createElement(
      'span',
      null,
      typeof value === 'string' ? value : JSON.stringify(value, null, 2),
    ),
    getStoredAppSessionToken: () => 'session-token',
    resolveClawRouterRuntimeBoolean: () => false,
  };
}

function installSsrRequireHooks() {
  const originalLoad = Module._load;
  const shims = new Map([
    ['motion/react', createMotionShim()],
    ['react-i18next', createI18nShim()],
    ['sdkwork-clawroutes-pc-commons', createCommonsShim()],
  ]);

  Module._load = function loadForApiReferenceSsrSmoke(request, parent, isMain) {
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

const documentsApiReferenceRoot = path.join(
  portalRoot,
  '../../../sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src',
);

const { ApiPlayground } = require(path.join(documentsApiReferenceRoot, 'components/ApiPlayground.tsx'));
const { ApiPlaygroundParamsTable } = require(path.join(documentsApiReferenceRoot, 'components/ApiPlaygroundParamsTable.tsx'));
const { createApiPlaygroundInitialState } = require(path.join(documentsApiReferenceRoot, 'apiPlaygroundRows.ts'));

const endpoint = {
  id: 'create-response',
  name: 'Create response',
  method: 'POST',
  path: '/v1/models/{model}/responses',
  description: 'Create a model response.',
  openApiOperation: {
    parameters: [
      { in: 'path', name: 'model', required: true, description: 'Model id' },
      { in: 'query', name: 'limit', required: true, description: 'Page size' },
      { in: 'header', name: 'X-Trace-Id', description: 'Trace id' },
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['prompt'],
            properties: {
              prompt: { type: 'string', example: 'hello' },
              stream: { type: 'boolean' },
            },
          },
        },
      },
    },
  },
};

test('api reference playground SSR renders actionable parameter DOM controls', () => {
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: ['/api-reference'] },
      React.createElement(ApiPlayground, {
        endpoint,
        requestBaseUrl: '/v1',
        onClose: () => undefined,
      }),
    ),
  );

  assert.match(html, /API Playground/);
  assert.match(html, /Create response/);
  assert.match(html, /Query Params/);
  assert.match(html, /Path Variables/);
  assert.match(html, /Headers/);
  assert.match(html, /Bulk Edit/);
  assert.match(html, /Authorization/);
  assert.match(html, /Body/);
  assert.match(html, /Send/);
  assert.match(html, /Copy URL/);
  assert.match(html, /model/);
  assert.match(html, /limit/);
  assert.doesNotMatch(html, /Math\.random|Date\.now|crypto\.randomUUID/);
});

test('api reference playground initial state exposes request body mock contract', () => {
  const state = createApiPlaygroundInitialState(endpoint);

  assert.equal(state.activeTab, 'params');
  assert.match(state.bodyValue, /"prompt": "hello"/);
  assert.match(state.bodyValue, /"stream": true/);
});

test('api reference playground SSR renders header parameter table contract', () => {
  const state = createApiPlaygroundInitialState(endpoint);
  const html = renderToStaticMarkup(
    React.createElement(ApiPlaygroundParamsTable, {
      title: 'Headers',
      params: state.headerParams,
      errors: {},
      onChange: () => undefined,
      onRemove: () => undefined,
      onBulkEdit: () => undefined,
    }),
  );

  assert.match(html, /Headers/);
  assert.match(html, /X-Trace-Id/);
  assert.match(html, /Trace id/);
  assert.match(html, /Bulk Edit/);
  assert.doesNotMatch(html, /Math\.random|Date\.now|crypto\.randomUUID/);
});
