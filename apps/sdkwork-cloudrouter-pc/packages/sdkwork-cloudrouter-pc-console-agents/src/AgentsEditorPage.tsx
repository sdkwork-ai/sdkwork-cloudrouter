import { AgentsView } from './AgentsView.tsx';

/**
 * Full-bleed host frame for the Agents create/edit flow.
 *
 * The console shell owns the chrome of a *section* page: the site navbar, the
 * console sidebar, and the content gutters. Creating or reconfiguring one agent
 * is not a section — the form carries its own header (back, save draft, publish)
 * and its own three columns — so the host mounts it on a sibling route, outside
 * the console branch, and this frame is the whole distance between the route and
 * the block. The user gets the form and nothing else, and the only way out is the
 * form's own back control, which returns to the agent list.
 *
 * It stays a frame on purpose: the agent catalog, the module catalog and the
 * editor are owned by sdkwork-agents and reached through {@link AgentsView}, so
 * nothing Agents-specific is decided here. That is also why the frame adds no
 * header of its own — a second one would compete with the form's. The frame
 * does provide the `<main>` landmark the full-page route would otherwise lack,
 * so assistive technology sees one primary region instead of an unlabeled
 * document.
 */
export function AgentsEditorPage() {
  return (
    <main className="h-[100dvh] min-h-0 w-full overflow-hidden bg-slate-50 dark:bg-[#121212]">
      <AgentsView />
    </main>
  );
}
