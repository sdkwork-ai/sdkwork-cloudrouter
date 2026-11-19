# @sdkwork/cloudrouter-mp-community

Community (circles and groups) adapter for the WeChat mini program.

The generated community App SDK is constructed here with the shared mini
program TokenManager; the root runtime publishes the adapter as
`app.globalData.communityApi` and pages bind the flattened records.

- Native pages: discovery, detail, resources/members/groups tabs, composer,
  comments, reactions, circle creation.
- The complete management and paid-checkout workspace remains available through
  `pages/community/web/index` (H5).

The transport is the generated SDK's `fetch` surface; `app.js` binds the
`fetch`/`AbortController` globals to `wx.request` before the runtime bundle
constructs any client.
