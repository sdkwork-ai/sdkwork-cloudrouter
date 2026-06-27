import { FormEvent, useState } from 'react';
import {
  Button,
  DataPanel,
  EmptyState,
  ErrorAlert,
  Field,
  PageHeader,
  TextInput,
} from '@sdkwork/mcp-pc-commons';
import {
  listAdminCategories,
  upsertAdminCategory,
  useAsyncResource,
  useMCPClients,
  type UpsertMcpServerCategoryCommand,
} from '@sdkwork/mcp-pc-core';

const defaultForm: UpsertMcpServerCategoryCommand = {
  category_code: 'integrations',
  name: 'Integrations',
  description: 'Third-party and integration MCP servers.',
  sort_order: 10,
};

export function AdminCategoriesPage() {
  const clients = useMCPClients();
  const [form, setForm] = useState<UpsertMcpServerCategoryCommand>(defaultForm);
  const [error, setError] = useState<string | null>(null);
  const { data: categories, error: loadError, loading, reload } = useAsyncResource(
    () => listAdminCategories(clients),
    [clients],
  );

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await upsertAdminCategory(clients, form);
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Curate marketplace navigation groups. Platform categories use tenant_id=0 seeds."
      />
      {error || loadError ? <div className="mb-4"><ErrorAlert message={error ?? loadError ?? ''} /></div> : null}
      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <DataPanel>
          <form onSubmit={onSubmit} className="grid gap-4 p-5">
            <h3 className="text-sm font-semibold text-slate-900">Upsert category</h3>
            <Field label="Category code">
              <TextInput
                value={form.category_code}
                onChange={(event) => setForm({ ...form, category_code: event.target.value })}
                required
              />
            </Field>
            <Field label="Name">
              <TextInput
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </Field>
            <Field label="Description">
              <TextInput
                value={form.description ?? ''}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </Field>
            <Field label="Sort order">
              <TextInput
                type="number"
                value={String(form.sort_order ?? 0)}
                onChange={(event) =>
                  setForm({ ...form, sort_order: Number(event.target.value) || 0 })
                }
              />
            </Field>
            <Button type="submit">Save category</Button>
          </form>
        </DataPanel>
        <section>
          {loading ? (
            <p className="text-sm text-slate-500">Loading categories…</p>
          ) : !categories || categories.length === 0 ? (
            <EmptyState title="No categories" description="Create categories to organize the marketplace." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Sort</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categories.map((category) => (
                    <tr key={category.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{category.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{category.category_code}</td>
                      <td className="px-4 py-3">{category.sort_order}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
