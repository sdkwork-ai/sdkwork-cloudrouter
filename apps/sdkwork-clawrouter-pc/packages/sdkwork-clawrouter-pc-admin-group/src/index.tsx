import React, { useEffect, useState } from 'react';
import { AdminTableShell, BottomPagination, BusinessStateTableRow, ConfirmDialog } from '@sdkwork/clawroutes-pc-commons';
import { Plus, Search, Trash2, Edit, ChevronDown, ChevronLeft, ChevronRight, RefreshCw, ArrowUpDown, LayoutGrid, X, Link2, Save, Coins, Info } from 'lucide-react';
import { GroupService, buildGroupRoutePreflight, type GroupAiResourceOption, type GroupChannelBindingData, type GroupChannelBindingInput, type GroupChannelOption, type GroupData, type GroupResourceGroupOption, type GroupRouteExplainResult } from './groupService';
import { createGroupInputFromForm, createGroupUpdateInputFromForm } from './groupForm';
import { useTranslation } from 'react-i18next';

const CHANNEL_PICKER_PAGE_SIZE = 12;
const RESOURCE_GROUP_PICKER_PAGE_SIZE = 20;
const RESOURCE_PICKER_PAGE_SIZE = 20;
type ResourceAccessTab = 'resourceGroups' | 'resources';
type ResourceSelectorSelectionMode = 'single' | 'multiple';
type TranslationFunction = ReturnType<typeof useTranslation>['t'];
type ResourceAccessSummaryItem = {
  kind: 'resourceGroup' | 'resource';
  code: string;
  title: string;
  subtitle: string;
  meta: string[];
  details: Array<{ label: string; value: string }>;
};

const pricingResourceCategories = [
  { id: 'model', defaultFormulaMode: 'official_multiplier', defaultMultiplier: 1 },
  { id: 'image', defaultFormulaMode: 'official_multiplier', defaultMultiplier: 1 },
  { id: 'video', defaultFormulaMode: 'official_multiplier', defaultMultiplier: 1 },
  { id: 'audio', defaultFormulaMode: 'official_multiplier', defaultMultiplier: 1 },
  { id: 'music', defaultFormulaMode: 'official_multiplier', defaultMultiplier: 1 },
  { id: 'sfx', defaultFormulaMode: 'official_multiplier', defaultMultiplier: 1 },
  { id: 'api_resource', defaultFormulaMode: 'official_multiplier', defaultMultiplier: 1 },
] as const;

export function GroupAdmin() {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [totalGroups, setTotalGroups] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupData | null>(null);
  const [priceReferenceMode, setPriceReferenceMode] = useState<GroupData['priceReferenceMode']>('multiplier');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GroupData | null>(null);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [channelBindingTarget, setChannelBindingTarget] = useState<GroupData | null>(null);
  const [priceSettingsTarget, setPriceSettingsTarget] = useState<GroupData | null>(null);
  const [channelBindings, setChannelBindings] = useState<GroupChannelBindingData[]>([]);
  const [channelOptions, setChannelOptions] = useState<GroupChannelOption[]>([]);
  const [bindingDraft, setBindingDraft] = useState<Record<string, GroupChannelBindingInput>>({});
  const [bindingLoading, setBindingLoading] = useState(false);
  const [bindingSaving, setBindingSaving] = useState(false);
  const [bindingError, setBindingError] = useState<string | null>(null);
  const [routeExplain, setRouteExplain] = useState<GroupRouteExplainResult | null>(null);
  const [routeExplainError, setRouteExplainError] = useState<string | null>(null);
  const [bindingSearchQuery, setBindingSearchQuery] = useState('');
  const [isChannelPickerOpen, setIsChannelPickerOpen] = useState(false);
  const [pickerSearchQuery, setPickerSearchQuery] = useState('');
  const [pickerSelection, setPickerSelection] = useState<Record<string, boolean>>({});
  const [pickerPage, setPickerPage] = useState(1);
  const [pickerChannels, setPickerChannels] = useState<GroupChannelOption[]>([]);
  const [pickerTotal, setPickerTotal] = useState(0);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [resourceAccessTab, setResourceAccessTab] = useState<ResourceAccessTab>('resourceGroups');
  const [selectedResourceGroupCodes, setSelectedResourceGroupCodes] = useState<string[]>([]);
  const [selectedResourceCodes, setSelectedResourceCodes] = useState<string[]>([]);
  const [resourceGroupOptionByCode, setResourceGroupOptionByCode] = useState<Record<string, GroupResourceGroupOption>>({});
  const [resourceOptionByCode, setResourceOptionByCode] = useState<Record<string, GroupAiResourceOption>>({});
  const [resourceAccessError, setResourceAccessError] = useState<string | null>(null);
  const [resourceGroupSelectorOpen, setResourceGroupSelectorOpen] = useState(false);
  const [resourceSelectorOpen, setResourceSelectorOpen] = useState(false);
  const [resourceGroupPickerSearch, setResourceGroupPickerSearch] = useState('');
  const [resourceGroupPickerPage, setResourceGroupPickerPage] = useState(1);
  const [resourceGroupPickerOptions, setResourceGroupPickerOptions] = useState<GroupResourceGroupOption[]>([]);
  const [resourceGroupPickerTotal, setResourceGroupPickerTotal] = useState(0);
  const [resourceGroupPickerLoading, setResourceGroupPickerLoading] = useState(false);
  const [resourcePickerSearch, setResourcePickerSearch] = useState('');
  const [resourcePickerPage, setResourcePickerPage] = useState(1);
  const [resourcePickerOptions, setResourcePickerOptions] = useState<GroupAiResourceOption[]>([]);
  const [resourcePickerTotal, setResourcePickerTotal] = useState(0);
  const [resourcePickerLoading, setResourcePickerLoading] = useState(false);
  const [resourceAccessDetailTarget, setResourceAccessDetailTarget] = useState<ResourceAccessSummaryItem | null>(null);
  const groupSelectClassName = 'w-full rounded-lg border border-slate-300 bg-white pl-3 pr-10 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 dark:border-white/10 dark:bg-[#202020] dark:text-white dark:focus:border-emerald-500 appearance-none cursor-pointer';
  const groupOptionClassName = 'bg-white text-slate-900 dark:bg-[#202020] dark:text-white';

  const loadGroups = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await GroupService.fetchGroups({
        page,
        pageSize,
        q: searchQuery.trim() || undefined,
      });
      setGroups(data.groups);
      setTotalGroups(data.total);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadGroups();
  }, [page, pageSize, searchQuery]);

  // Group list filters are server-side via q only; channelGroups.list has no provider/status/type query params.
  const visibleGroups = [...groups].sort((left, right) => {
    const result = left.groupName.localeCompare(right.groupName);
    return sortDirection === 'asc' ? result : -result;
  });

  useEffect(() => {
    setPage(1);
  }, [searchQuery, sortDirection]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(totalGroups / pageSize));
    setPage(current => Math.min(Math.max(current, 1), totalPages));
  }, [totalGroups, pageSize]);

  const openCreateModal = () => {
    setEditingGroup(null);
    setPriceReferenceMode('multiplier');
    resetResourceAccessSelection(null);
    setIsModalOpen(true);
  };

  const openEditModal = (group: GroupData) => {
    setEditingGroup(group);
    setPriceReferenceMode(group.priceReferenceMode);
    resetResourceAccessSelection(group);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saving) {
      return;
    }
    setIsModalOpen(false);
    setEditingGroup(null);
    setPriceReferenceMode('multiplier');
    resetResourceAccessSelection(null);
    setResourceGroupSelectorOpen(false);
    setResourceSelectorOpen(false);
    setResourceGroupPickerSearch('');
    setResourceGroupPickerPage(1);
    setResourcePickerSearch('');
    setResourcePickerPage(1);
    setResourceAccessDetailTarget(null);
  };

  const resetResourceAccessSelection = (group: GroupData | null) => {
    setResourceAccessTab('resourceGroups');
    setSelectedResourceGroupCodes(group?.resourceGroupCodes ?? []);
    setSelectedResourceCodes(group?.resourceCodes ?? []);
    setResourceAccessError(null);
    setResourceAccessDetailTarget(null);
  };

  const removeSelectedResourceGroupCode = (code: string) => {
    setSelectedResourceGroupCodes(current => current.filter(item => item !== code));
    setResourceAccessDetailTarget(current => current?.code === code ? null : current);
  };

  const removeSelectedResourceCode = (code: string) => {
    setSelectedResourceCodes(current => current.filter(item => item !== code));
    setResourceAccessDetailTarget(current => current?.code === code ? null : current);
  };

  const openResourceAccessDetail = (item: ResourceAccessSummaryItem) => {
    setResourceAccessDetailTarget(item);
  };

  const mergeResourceGroupOptions = (options: GroupResourceGroupOption[]) => {
    setResourceGroupOptionByCode(current => {
      const next = { ...current };
      for (const option of options) {
        next[option.groupCode] = option;
      }
      return next;
    });
  };

  const mergeResourceOptions = (options: GroupAiResourceOption[]) => {
    setResourceOptionByCode(current => {
      const next = { ...current };
      for (const option of options) {
        next[option.resourceCode] = option;
      }
      return next;
    });
  };

  const loadResourceGroupPicker = async () => {
    setResourceGroupPickerLoading(true);
    setResourceAccessError(null);
    try {
      const data = await GroupService.fetchAssignableResourceGroups({
        page: resourceGroupPickerPage,
        pageSize: RESOURCE_GROUP_PICKER_PAGE_SIZE,
        q: resourceGroupPickerSearch.trim() || undefined,
      });
      setResourceGroupPickerOptions(data.resourceGroups);
      setResourceGroupPickerTotal(data.total);
      mergeResourceGroupOptions(data.resourceGroups);
    } catch (error) {
      setResourceAccessError(error instanceof Error ? error.message : t('admin.group.resourceAccess.errors.load'));
    } finally {
      setResourceGroupPickerLoading(false);
    }
  };

  const loadResourcePicker = async () => {
    setResourcePickerLoading(true);
    setResourceAccessError(null);
    try {
      const data = await GroupService.fetchAssignableResources({
        page: resourcePickerPage,
        pageSize: RESOURCE_PICKER_PAGE_SIZE,
        q: resourcePickerSearch.trim() || undefined,
      });
      setResourcePickerOptions(data.resources);
      setResourcePickerTotal(data.total);
      mergeResourceOptions(data.resources);
    } catch (error) {
      setResourceAccessError(error instanceof Error ? error.message : t('admin.group.resourceAccess.errors.load'));
    } finally {
      setResourcePickerLoading(false);
    }
  };

  const refreshResourceAccessPickers = () => {
    if (resourceGroupSelectorOpen) {
      void loadResourceGroupPicker();
      return;
    }
    if (resourceSelectorOpen) {
      void loadResourcePicker();
    }
  };

  const openResourceGroupSelector = () => {
    setResourceGroupPickerSearch('');
    setResourceGroupPickerPage(1);
    setResourceGroupSelectorOpen(true);
  };

  const closeResourceGroupSelector = () => {
    setResourceGroupSelectorOpen(false);
    setResourceGroupPickerSearch('');
    setResourceGroupPickerPage(1);
  };

  const openResourceSelector = () => {
    setResourcePickerSearch('');
    setResourcePickerPage(1);
    setResourceSelectorOpen(true);
  };

  const closeResourceSelector = () => {
    setResourceSelectorOpen(false);
    setResourcePickerSearch('');
    setResourcePickerPage(1);
  };

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    setSaving(true);
    try {
      if (editingGroup) {
        const updated = await GroupService.updateGroup(editingGroup.id, createGroupUpdateInputFromForm(formData));
        setGroups(current => current.map(group => group.id === updated.id ? updated : group));
      } else {
        const added = await GroupService.addGroup(createGroupInputFromForm(formData));
        setGroups(current => [added, ...current]);
      }
      setIsModalOpen(false);
      setEditingGroup(null);
      setLoadError(null);
    } finally {
      setSaving(false);
    }
  };

  const closeDeleteConfirmation = () => {
    if (deletingGroupId) {
      return;
    }
    setDeleteTarget(null);
  };

  const executeDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    const id = deleteTarget.id;
    setDeletingGroupId(id);
    try {
      const success = await GroupService.deleteGroup(id);
      if (success) {
        setGroups(current => current.filter(g => g.id !== id));
      }
      setDeleteTarget(null);
    } finally {
      setDeletingGroupId(null);
    }
  };

  const openChannelBindingModal = async (group: GroupData) => {
    setChannelBindingTarget(group);
    setBindingLoading(true);
    setBindingSaving(false);
    setBindingError(null);
    setChannelBindings([]);
    setChannelOptions([]);
    setBindingDraft({});
    setRouteExplain(null);
    setRouteExplainError(null);
    setBindingSearchQuery('');
    setIsChannelPickerOpen(false);
    setPickerSearchQuery('');
    setPickerSelection({});
    try {
      const [bindings, explain] = await Promise.all([
        GroupService.fetchGroupChannelBindings(group.id),
        GroupService.fetchGroupRouteExplain(group.id).then(
          value => ({ value, error: null }),
          error => ({ value: null, error }),
        ),
      ]);
      setChannelBindings(bindings);
      setBindingDraft(bindingsToDraft(bindings));
      setRouteExplain(explain.value);
      setRouteExplainError(explain.error ? t('admin.group.routePreflight.backendExplainUnavailable') : null);
    } catch (error) {
      setBindingError(error instanceof Error ? error.message : t('admin.group.channelBindings.errors.load'));
    } finally {
      setBindingLoading(false);
    }
  };

  const closeChannelBindingModal = () => {
    if (bindingSaving) {
      return;
    }
    setChannelBindingTarget(null);
    setChannelBindings([]);
    setChannelOptions([]);
    setBindingDraft({});
    setRouteExplain(null);
    setRouteExplainError(null);
    setBindingError(null);
    setBindingSearchQuery('');
    setIsChannelPickerOpen(false);
    setPickerSearchQuery('');
    setPickerSelection({});
    setPickerPage(1);
    setPickerChannels([]);
    setPickerTotal(0);
  };

  const loadPickerChannels = async () => {
    setPickerLoading(true);
    try {
      const data = await GroupService.fetchAssignableChannels({
        page: pickerPage,
        pageSize: CHANNEL_PICKER_PAGE_SIZE,
        q: pickerSearchQuery.trim() || undefined,
      });
      setPickerChannels(data.channels);
      setPickerTotal(data.total);
      setChannelOptions(current => {
        const next = new Map(current.map(channel => [channel.id, channel]));
        for (const channel of data.channels) {
          next.set(channel.id, channel);
        }
        return Array.from(next.values());
      });
    } catch (error) {
      setBindingError(error instanceof Error ? error.message : t('admin.group.channelBindings.errors.load'));
    } finally {
      setPickerLoading(false);
    }
  };

  useEffect(() => {
    if (!isChannelPickerOpen) {
      return;
    }
    void loadPickerChannels();
  }, [isChannelPickerOpen, pickerPage, pickerSearchQuery]);

  useEffect(() => {
    if (!resourceGroupSelectorOpen) {
      return;
    }
    void loadResourceGroupPicker();
  }, [resourceGroupSelectorOpen, resourceGroupPickerPage, resourceGroupPickerSearch]);

  useEffect(() => {
    if (!resourceSelectorOpen) {
      return;
    }
    void loadResourcePicker();
  }, [resourceSelectorOpen, resourcePickerPage, resourcePickerSearch]);

  const resourceGroupPickerTotalPages = Math.max(1, Math.ceil(resourceGroupPickerTotal / RESOURCE_GROUP_PICKER_PAGE_SIZE));
  const resourcePickerTotalPages = Math.max(1, Math.ceil(resourcePickerTotal / RESOURCE_PICKER_PAGE_SIZE));

  useEffect(() => {
    setResourceGroupPickerPage(current => Math.min(Math.max(current, 1), resourceGroupPickerTotalPages));
  }, [resourceGroupPickerTotalPages]);

  useEffect(() => {
    setResourcePickerPage(current => Math.min(Math.max(current, 1), resourcePickerTotalPages));
  }, [resourcePickerTotalPages]);

  const openPriceSettingsDrawer = (group: GroupData) => {
    setPriceSettingsTarget(group);
  };

  const closePriceSettingsDrawer = () => {
    setPriceSettingsTarget(null);
  };

  const openChannelBindingPicker = () => {
    setPickerSearchQuery('');
    setPickerSelection({});
    setPickerPage(1);
    setIsChannelPickerOpen(true);
  };

  const closeChannelBindingPicker = () => {
    setIsChannelPickerOpen(false);
    setPickerSearchQuery('');
    setPickerSelection({});
    setPickerPage(1);
  };

  const isChannelAlreadyBound = (channelId: string) => Boolean(bindingDraft[channelId]);

  const togglePickerSelection = (channelId: string) => {
    if (isChannelAlreadyBound(channelId)) {
      return;
    }
    setPickerSelection(current => ({ ...current, [channelId]: !current[channelId] }));
  };

  const addSelectedChannelBindings = () => {
    const selectedIds = Object.entries(pickerSelection)
      .filter(([channelId, selected]) => selected && !isChannelAlreadyBound(channelId))
      .map(([channelId]) => channelId);

    if (selectedIds.length === 0) {
      return;
    }

    setBindingDraft(current => {
      const next = { ...current };
      for (const channelId of selectedIds) {
        if (next[channelId]) {
          continue;
        }
        const channel = pickerChannels.find(option => option.id === channelId)
          ?? channelOptions.find(option => option.id === channelId);
        if (!channel) {
          continue;
        }
        next[channel.id] = {
          channelId: channel.id,
          priority: 100,
          weight: 100,
          status: 'active',
          resourceCodes: channel.resourceCodes,
          apiScope: channel.apiScope,
          capabilities: channel.capabilities,
        };
      }
      return next;
    });
    closeChannelBindingPicker();
  };

  const removeChannelBindingDraft = (channelId: string) => {
    setBindingDraft(current => {
      if (!current[channelId]) {
        return current;
      }
      const next = { ...current };
      delete next[channelId];
      return next;
    });
  };

  const updateChannelBindingDraft = (channelId: string, patch: Partial<GroupChannelBindingInput>) => {
    setBindingDraft(current => {
      const existing = current[channelId];
      if (!existing) {
        return current;
      }
      return { ...current, [channelId]: { ...existing, ...patch } };
    });
  };

  const saveChannelBindings = async () => {
    if (!channelBindingTarget) {
      return;
    }
    setBindingSaving(true);
    setBindingError(null);
    try {
      const saved = await GroupService.replaceGroupChannelBindings(
        channelBindingTarget.id,
        Object.values(bindingDraft).sort((left, right) => {
          const priority = (left.priority ?? 100) - (right.priority ?? 100);
          return priority !== 0 ? priority : (right.weight ?? 100) - (left.weight ?? 100);
        }),
      );
      setChannelBindings(saved);
      setBindingDraft(bindingsToDraft(saved));
      closeChannelBindingModal();
    } catch (error) {
      setBindingError(error instanceof Error ? error.message : t('admin.group.channelBindings.errors.save'));
    } finally {
      setBindingSaving(false);
    }
  };

  const selectedBindingCount = Object.keys(bindingDraft).length;
  const selectedPickerCount = Object.entries(pickerSelection)
    .filter(([channelId, selected]) => selected && !isChannelAlreadyBound(channelId))
    .length;
  const channelOptionById = new Map(channelOptions.map(channel => [channel.id, channel]));
  const bindingByChannelId = new Map(channelBindings.map(binding => [binding.channelId, binding]));
  const routePreflightBindingRows = Object.values(bindingDraft)
    .map(draft => {
      const persisted = bindingByChannelId.get(draft.channelId);
      const option = channelOptionById.get(draft.channelId);
      return {
        channelId: draft.channelId,
        channelName: persisted?.channelName ?? option?.name ?? draft.channelId,
        providerCode: persisted?.providerCode ?? option?.providerCode ?? 'unknown',
        providerName: persisted?.providerName ?? option?.providerName ?? 'unknown',
        channelCode: persisted?.channelCode ?? option?.channelCode ?? draft.channelId,
        resourceCodes: draft.resourceCodes ?? persisted?.resourceCodes ?? option?.resourceCodes ?? [],
        apiScope: draft.apiScope ?? persisted?.apiScope ?? option?.apiScope ?? [],
        capabilities: draft.capabilities ?? persisted?.capabilities ?? option?.capabilities ?? [],
        priority: draft.priority ?? persisted?.priority ?? 100,
        weight: draft.weight ?? persisted?.weight ?? 100,
        status: draft.status ?? persisted?.status ?? 'active',
        healthStatus: persisted?.healthStatus ?? option?.healthStatus ?? 'active',
      };
    })
    .sort((left, right) => {
      const priority = left.priority - right.priority;
      return priority !== 0 ? priority : right.weight - left.weight;
    });
  const visibleBindingRows = routePreflightBindingRows
    .filter(row => matchesChannelSearch(bindingSearchQuery, [
      row.channelName,
      row.channelCode,
      row.providerName,
      row.providerCode,
      ...row.resourceCodes,
      ...row.apiScope,
      ...row.capabilities,
    ]));
  const routePreflight = channelBindingTarget
    ? buildGroupRoutePreflight(channelBindingTarget, routePreflightBindingRows)
    : null;
  const routePreflightSummary = routeExplain ?? routePreflight;
  const addableChannelCount = pickerChannels.filter(channel => !isChannelAlreadyBound(channel.id)).length;
  const pickerTotalPages = Math.max(1, Math.ceil(pickerTotal / CHANNEL_PICKER_PAGE_SIZE));
  const pickerStartIndex = pickerTotal === 0
    ? 0
    : (pickerPage - 1) * CHANNEL_PICKER_PAGE_SIZE + 1;
  const pickerEndIndex = Math.min(pickerTotal, pickerPage * CHANNEL_PICKER_PAGE_SIZE);

  useEffect(() => {
    setPickerPage(current => Math.min(Math.max(current, 1), pickerTotalPages));
  }, [pickerTotalPages]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden">
      <div className="flex shrink-0 flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t("admin.group.index.text.1y74ql", "Search channel groups...")}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-emerald-500 w-[200px] text-slate-900 dark:text-white placeholder-slate-500 transition-colors shadow-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-auto xl:ml-0">
          <button onClick={() => { void loadGroups(); }} className="p-2 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setSortDirection(current => current === 'asc' ? 'desc' : 'asc')} className="flex items-center gap-2 px-3 py-2 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-sm font-medium">
            <ArrowUpDown className="w-4 h-4" /> {t("admin.group.index.text.dqvmz2", "Sort")}
          </button>
          <button onClick={openCreateModal} className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm">
            <Plus className="w-4 h-4" /> {t("admin.group.index.text.1fp7vgi", "Create group")}
          </button>
        </div>
      </div>

      <AdminTableShell
        data-admin-group-table-card
        className="flex-1 min-h-0 rounded-xl dark:bg-[#1a1a1a]"
        header={loadError && groups.length > 0 ? (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
            <div className="font-semibold">{t('admin.group.state.loadErrorTitle')}</div>
            <div className="mt-1 text-xs">{t('admin.group.state.staleDataDescription')}</div>
          </div>
        ) : null}
        footer={(
          <div data-admin-group-pagination>
            <BottomPagination
              page={page}
              pageSize={pageSize}
              itemCount={totalGroups}
              hasNextPage={page * pageSize < totalGroups}
              disabled={loading}
              showingLabel={t('admin.group.pagination.showing')}
              pageLabel={t('admin.group.pagination.page', { page })}
              pageSizeLabel={t('admin.group.pagination.pageSize')}
              previousLabel={t('common.actions.previousPage')}
              nextLabel={t('common.actions.nextPage')}
              pageSizeOptions={[10, 20, 50, 100]}
              onPreviousPage={() => setPage(current => Math.max(1, current - 1))}
              onNextPage={() => setPage(current => current + 1)}
              onPageSizeChange={(nextPageSize) => {
                setPageSize(nextPageSize);
                setPage(1);
              }}
            />
          </div>
        )}
        viewportClassName="min-h-0 flex-1"
        viewportProps={{ 'data-admin-group-table-viewport': true }}
      >
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#121212] border-b border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-6 py-4">{t("admin.group.index.text.hzx914", "Group name")}<ChevronDown className="inline w-3 h-3 ml-1" /></th>
              <th className="px-6 py-4">{t("admin.group.index.text.azlr3p", "Price reference mode")}<ChevronDown className="inline w-3 h-3 ml-1" /></th>
              <th className="px-6 py-4">{t("admin.group.index.text.3aby9g", "Rate multiplier")}<ChevronDown className="inline w-3 h-3 ml-1" /></th>
              <th className="px-6 py-4">{t("admin.group.index.text.anh4cj", "Group type")}<ChevronDown className="inline w-3 h-3 ml-1" /></th>
              <th className="px-6 py-4">{t("admin.group.index.text.qxduge", "Accounts")}<ChevronDown className="inline w-3 h-3 ml-1" /></th>
              <th className="px-6 py-4">{t("admin.group.index.text.svba5d", "Capacity")}</th>
              <th className="px-6 py-4">{t("admin.group.index.text.yetrt4", "Usage")}</th>
              <th className="px-6 py-4">{t("admin.finance.index.text.1ccx4t4", "Status")}<ChevronDown className="inline w-3 h-3 ml-1" /></th>
              <th className="px-6 py-4">{t("admin.group.index.text.501w24", "Actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/5">
            {loading ? (
              <BusinessStateTableRow colSpan={9} kind="loading" title={t('admin.group.state.loading')} />
            ) : loadError && groups.length === 0 ? (
              <BusinessStateTableRow
                colSpan={9}
                kind="error"
                title={t('admin.group.state.loadErrorTitle')}
                description={t('admin.group.state.loadErrorDescription')}
                onRetry={() => { void loadGroups(); }}
                retryLabel={t('common.actions.retry')}
              />
            ) : visibleGroups.length === 0 ? (
              <BusinessStateTableRow
                colSpan={9}
                kind="empty"
                title={t('admin.group.state.emptyTitle')}
                description={t('admin.group.state.emptyDescription')}
              />
            ) : visibleGroups.map(group => (
              <tr key={group.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                  <div className="flex flex-col gap-1">
                    <span>{group.groupName}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-xs">
                    {displayGroupPriceReferenceMode(group.priceReferenceMode, t)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {formatGroupMultiplier(group)}x
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-xs">
                    {displayGroupType(group.groupType, t)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1 text-xs text-slate-500">
                    <div>{t("admin.group.index.text.ds8wtk", "Available:")}<span className="font-mono text-emerald-600 dark:text-emerald-400">{group.accountCount.available}</span></div>
                    <div>{t("admin.group.index.text.n15nxr", "Total:")}<span className="font-mono">{group.accountCount.total}</span></div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-white/10 text-slate-500 text-xs font-mono">
                    <LayoutGrid className="w-3 h-3" /> {group.capacity.used} / {group.capacity.total}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1 text-xs text-slate-500">
                    <div>{t("admin.group.index.text.u2by7c", "Today")}<span className="font-mono text-slate-900 dark:text-white"> {group.usage.today}</span></div>
                    <div>{t("admin.group.index.text.1nuqk4t", "Total")}<span className="font-mono"> {group.usage.total}</span></div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20">
                    {displayGroupStatus(group.status, t)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                    <button onClick={() => openEditModal(group)} className="flex flex-col items-center gap-1 hover:text-blue-500 transition-colors">
                      <Edit className="w-4 h-4" /> <span>{t("admin.group.index.text.qreyeg", "Edit")}</span>
                    </button>
                    <button onClick={() => { void openChannelBindingModal(group); }} className="flex flex-col items-center gap-1 hover:text-emerald-500 transition-colors">
                      <Link2 className="w-4 h-4" /> <span>{t('admin.group.channelBindings.action')}</span>
                    </button>
                    <button onClick={() => openPriceSettingsDrawer(group)} className="flex flex-col items-center gap-1 hover:text-amber-500 transition-colors">
                      <Coins className="w-4 h-4" /> <span>{t('admin.group.priceSettings.action')}</span>
                    </button>
                    <button onClick={() => setDeleteTarget(group)} className="flex flex-col items-center gap-1 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" /> <span>{t("admin.group.index.text.1t2vi4h", "Delete")}</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTableShell>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto pt-10 pb-10">
          <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl w-full max-w-5xl flex flex-col my-auto relative">
            <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-white/10">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{editingGroup ? t("admin.group.index.text.1emzsyy", "Edit group") : t("admin.group.index.text.1fp7vgi", "Create group")}</h3>
              <button onClick={closeModal} disabled={saving} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:cursor-not-allowed disabled:opacity-60">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddGroup} className="flex flex-col">
              <div data-admin-group-modal-layout className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.95fr)]">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2">{t("admin.group.index.text.hzx914", "Group name")}</label>
                    <input required name="groupName" type="text" placeholder={t("admin.group.index.text.1ok1vf5", "Enter group name")} defaultValue={editingGroup?.groupName ?? ''} className="w-full bg-transparent border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-500 text-slate-900 dark:text-white transition-colors" />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2">{t("admin.group.index.text.azlr3p", "Price reference mode")}</label>
                    <div className="relative">
                      <select name="priceReferenceMode" value={priceReferenceMode} className={groupSelectClassName} onChange={event => setPriceReferenceMode(event.target.value as GroupData['priceReferenceMode'])}>
                        <option className={groupOptionClassName} value="multiplier">{t('admin.group.priceReferenceMode.multiplier')}</option>
                        <option className={groupOptionClassName} value="official_price">{t('admin.group.priceReferenceMode.officialPrice')}</option>
                      </select>
                      <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {priceReferenceMode === 'multiplier' ? (
                    <div>
                      <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2">{t("admin.group.index.text.3aby9g", "Rate multiplier")}</label>
                      <input name="rateMultiplier" type="number" min="0.01" step="0.01" defaultValue={editingGroup?.rateMultiplier ?? 1} className="w-full bg-transparent border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-500 text-slate-900 dark:text-white transition-colors" />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2">{t('admin.group.fields.officialPriceMultiplier')}</label>
                      <input name="officialPriceMultiplier" type="number" min="0.01" step="0.01" defaultValue={editingGroup?.officialPriceMultiplier ?? editingGroup?.rateMultiplier ?? 1} className="w-full bg-transparent border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-500 text-slate-900 dark:text-white transition-colors" />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2">{t("admin.group.index.text.lsl2ul", "Group type")}</label>
                    <div className="relative">
                      <select name="groupType" defaultValue={editingGroup?.groupType ?? 'public'} className={groupSelectClassName}>
                        <option className={groupOptionClassName} value="public">{t('admin.group.groupType.public')}</option>
                        <option className={groupOptionClassName} value="dedicated">{t('admin.group.groupType.dedicated')}</option>
                      </select>
                      <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2">{t("admin.group.index.text.1yz6zgp", "Capacity total")}</label>
                    <input name="capacityTotal" type="number" min="1" step="1" defaultValue={editingGroup?.capacity.total ?? 100} className="w-full bg-transparent border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-500 text-slate-900 dark:text-white transition-colors" />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2">{t("admin.finance.index.text.1ccx4t4", "Status")}</label>
                    <div className="relative">
                      <select name="status" defaultValue={editingGroup?.status ?? 'active'} className={groupSelectClassName}>
                        <option className={groupOptionClassName} value="active">{t('common.status.active')}</option>
                        <option className={groupOptionClassName} value="disabled">{t('common.status.disabled')}</option>
                      </select>
                      <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div data-admin-group-resource-access className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{t('admin.group.resourceAccess.title')}</h4>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('admin.group.resourceAccess.description')}</p>
                    </div>
                    <button type="button" onClick={refreshResourceAccessPickers} disabled={resourceGroupPickerLoading || resourcePickerLoading} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5">
                      {t('common.actions.refresh')}
                    </button>
                  </div>

                  <input type="hidden" name="resourceGroupCodes" value="" />
                  <input type="hidden" name="resourceCodes" value="" />
                  {selectedResourceGroupCodes.map(code => (
                    <input key={`group-${code}`} type="hidden" name="resourceGroupCodes" value={code} />
                  ))}
                  {selectedResourceCodes.map(code => (
                    <input key={`resource-${code}`} type="hidden" name="resourceCodes" value={code} />
                  ))}

                  <div data-admin-group-resource-access-tabs className="mt-4 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-[#121212]">
                    <button type="button" onClick={() => setResourceAccessTab('resourceGroups')} className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${resourceAccessTab === 'resourceGroups' ? 'bg-white text-slate-900 shadow-sm dark:bg-[#202020] dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                      {t('admin.group.resourceAccess.tabs.resourceGroups')}
                    </button>
                    <button type="button" onClick={() => setResourceAccessTab('resources')} className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${resourceAccessTab === 'resources' ? 'bg-white text-slate-900 shadow-sm dark:bg-[#202020] dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                      {t('admin.group.resourceAccess.tabs.resources')}
                    </button>
                  </div>

                  {resourceAccessError && (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                      {resourceAccessError}
                    </div>
                  )}

                  <div className="mt-4">
                    {resourceAccessTab === 'resourceGroups' ? (
                      <ResourceAccessSummary
                        emptyText={t('admin.group.resourceAccess.emptyResourceGroups')}
                        items={selectedResourceGroupCodes.map(code => toResourceGroupSummaryItem(
                          code,
                          resourceGroupOptionByCode[code],
                          t,
                        ))}
                        rowDataAttribute="data-admin-group-selected-resource-group-row"
                        onDetail={openResourceAccessDetail}
                        onOpen={openResourceGroupSelector}
                        onRemove={removeSelectedResourceGroupCode}
                        t={t}
                      />
                    ) : (
                      <ResourceAccessSummary
                        emptyText={t('admin.group.resourceAccess.emptyResources')}
                        items={selectedResourceCodes.map(code => toAiResourceSummaryItem(
                          code,
                          resourceOptionByCode[code],
                          t,
                        ))}
                        rowDataAttribute="data-admin-group-selected-ai-resource-row"
                        onDetail={openResourceAccessDetail}
                        onOpen={openResourceSelector}
                        onRemove={removeSelectedResourceCode}
                        t={t}
                      />
                    )}
                  </div>
                </div>
              </div>
              <div className="p-5 flex justify-end gap-3 rounded-b-2xl">
                <button type="button" onClick={closeModal} disabled={saving} className="px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent dark:border-white/10 rounded-xl transition-colors bg-slate-50 dark:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-60">
                  {t("admin.group.index.text.1589w37", "Cancel")}
                </button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 rounded-xl shadow-sm transition-colors border border-transparent dark:border-[rgba(255,255,255,0.1)] disabled:cursor-not-allowed disabled:opacity-70">
                  {editingGroup ? t("admin.group.index.text.1c3mapc", "Save") : t("admin.group.index.text.khvw5c", "Create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resourceGroupSelectorOpen && (
        <ResourceGroupSelectorModal
          selectionMode="multiple"
          loading={resourceGroupPickerLoading}
          options={resourceGroupPickerOptions}
          selectedCodes={selectedResourceGroupCodes}
          searchQuery={resourceGroupPickerSearch}
          page={resourceGroupPickerPage}
          total={resourceGroupPickerTotal}
          totalPages={resourceGroupPickerTotalPages}
          onSearchChange={(value) => {
            setResourceGroupPickerSearch(value);
            setResourceGroupPickerPage(1);
          }}
          onPageChange={setResourceGroupPickerPage}
          onChange={setSelectedResourceGroupCodes}
          onClose={closeResourceGroupSelector}
          t={t}
        />
      )}

      {resourceSelectorOpen && (
        <PaginatedAiResourceSelectorModal
          selectionMode="multiple"
          loading={resourcePickerLoading}
          options={resourcePickerOptions}
          selectedCodes={selectedResourceCodes}
          searchQuery={resourcePickerSearch}
          page={resourcePickerPage}
          total={resourcePickerTotal}
          totalPages={resourcePickerTotalPages}
          onSearchChange={(value) => {
            setResourcePickerSearch(value);
            setResourcePickerPage(1);
          }}
          onPageChange={setResourcePickerPage}
          onChange={setSelectedResourceCodes}
          onClose={closeResourceSelector}
          t={t}
        />
      )}

      {resourceAccessDetailTarget && (
        <ResourceAccessDetailModal
          item={resourceAccessDetailTarget}
          onClose={() => setResourceAccessDetailTarget(null)}
          t={t}
        />
      )}

      {channelBindingTarget && (
        <div className="fixed inset-0 z-50 flex justify-start bg-slate-900/50 backdrop-blur-sm">
          <aside data-admin-group-channel-bindings-drawer className="flex h-full w-[90vw] max-w-[90vw] flex-col overflow-hidden border-r border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1a1a1a]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-white/10">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-bold text-slate-900 dark:text-white">
                  {t('admin.group.channelBindings.title')}
                </h3>
                <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                  {channelBindingTarget.groupName} | {t('admin.group.channelBindings.selectedCount', { count: selectedBindingCount })} | {t('admin.group.channelBindings.persistedCount', { count: channelBindings.length })}
                </p>
              </div>
              <button onClick={closeChannelBindingModal} disabled={bindingSaving} className="text-slate-400 transition-colors hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            {bindingError && (
              <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                {bindingError}
              </div>
            )}

            <div data-admin-group-channel-bindings-toolbar className="flex shrink-0 flex-col gap-3 border-b border-slate-200 p-5 dark:border-white/10 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  data-admin-group-channel-binding-search
                  type="text"
                  value={bindingSearchQuery}
                  onChange={event => setBindingSearchQuery(event.currentTarget.value)}
                  placeholder={t('admin.group.channelBindings.searchPlaceholder')}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 dark:border-white/10 dark:bg-[#202020] dark:text-white"
                />
              </div>
              <button
                data-admin-group-channel-binding-add
                type="button"
                onClick={openChannelBindingPicker}
                disabled={bindingLoading || bindingSaving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:hover:bg-emerald-400"
              >
                <Plus className="h-4 w-4" />
                {t('admin.group.channelBindings.add')}
              </button>
            </div>

            {routePreflight && routePreflightSummary && (
              <div
                data-admin-group-route-preflight
                className={`border-b px-5 py-3 text-sm ${
                  routePreflightSummary.ready
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200'
                    : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200'
                }`}
              >
                <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="font-medium">{t('admin.group.routePreflight.title')}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[11px] leading-4 opacity-80">
                      <span>{t('admin.group.routePreflight.localOnly')}</span>
                      <span>
                        {routeExplain?.source === 'backend_config'
                          ? t('admin.group.routePreflight.backendConfigExplain')
                          : t('admin.group.routePreflight.backendExplainUnavailable')}
                      </span>
                    </div>
                    <div className="mt-1 text-xs leading-5 opacity-90">
                      {routePreflightSummary.ready
                        ? t('admin.group.routePreflight.ready', {
                          bindings: routePreflightSummary.activeHealthyBindingCount,
                          resources: routeExplain?.configuredResourceAccessCount ?? routePreflight.configuredResourceAccessCount,
                        })
                        : t('admin.group.routePreflight.blocked', {
                          bindings: routePreflightSummary.activeHealthyBindingCount,
                          resources: routeExplain?.configuredResourceAccessCount ?? routePreflight.configuredResourceAccessCount,
                        })}
                    </div>
                    {routeExplain && (
                      <div className="mt-1 text-xs leading-5 opacity-90">
                        {t('admin.group.routePreflight.backendRoutable', {
                          bindings: routeExplain.routableBindingCount,
                          resources: routeExplain.effectiveResourceCodes.length,
                        })}
                      </div>
                    )}
                    {routeExplainError && (
                      <div className="mt-1 text-xs leading-5 opacity-80">
                        {routeExplainError}
                      </div>
                    )}
                  </div>
                  {routePreflightSummary.issues.length > 0 && (
                    <div className="flex max-w-3xl flex-wrap gap-2">
                      {routePreflightSummary.issues.map(issue => (
                        <span
                          key={issue.code}
                          className="rounded-full border border-current/20 bg-white/60 px-2.5 py-1 text-xs font-medium dark:bg-black/10"
                        >
                          {t(issue.messageKey)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-auto">
              {bindingLoading ? (
                <div className="flex min-h-[240px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                  {t('admin.group.channelBindings.loading')}
                </div>
              ) : visibleBindingRows.length === 0 ? (
                <div className="flex min-h-[280px] flex-col items-center justify-center gap-2 px-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  <div className="font-medium text-slate-700 dark:text-slate-200">
                    {selectedBindingCount === 0 ? t('admin.group.channelBindings.emptyBound') : t('admin.group.channelBindings.emptySearch')}
                  </div>
                  <div className="max-w-md text-xs leading-5">
                    {selectedBindingCount === 0 ? t('admin.group.channelBindings.emptyBoundDescription') : t('admin.group.channelBindings.emptySearchDescription')}
                  </div>
                </div>
              ) : (
                <table className="w-full min-w-[1080px] text-left text-sm text-slate-600 dark:text-slate-400">
                  <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 dark:border-white/10 dark:bg-[#121212] dark:text-slate-400">
                    <tr>
                      <th className="px-5 py-3">{t('admin.group.channelBindings.columns.channel')}</th>
                      <th className="px-5 py-3">{t('admin.group.channelBindings.columns.provider')}</th>
                      <th className="px-5 py-3">{t('admin.group.channelBindings.columns.resourceCodes')}</th>
                      <th className="px-5 py-3">{t('admin.group.channelBindings.columns.apiScope')}</th>
                      <th className="px-5 py-3">{t('admin.group.channelBindings.columns.priority')}</th>
                      <th className="px-5 py-3">{t('admin.group.channelBindings.columns.weight')}</th>
                      <th className="px-5 py-3">{t('admin.group.channelBindings.columns.status')}</th>
                      <th className="px-5 py-3">{t('admin.group.channelBindings.columns.health')}</th>
                      <th className="px-5 py-3 text-right">{t('admin.group.channelBindings.columns.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                    {visibleBindingRows.map(row => {
                      const draft = bindingDraft[row.channelId];
                      return (
                        <tr key={row.channelId} className="hover:bg-slate-50 dark:hover:bg-white/5">
                          <td className="max-w-[240px] px-5 py-3 align-middle">
                            <div className="min-w-0 whitespace-nowrap">
                              <div className="truncate font-medium text-slate-900 dark:text-white">{row.channelName}</div>
                              <div className="truncate text-xs text-slate-500">{row.channelCode}</div>
                            </div>
                          </td>
                          <td className="max-w-[180px] px-5 py-3 align-middle">
                            <div className="min-w-0 whitespace-nowrap">
                              <div className="truncate text-slate-700 dark:text-slate-200">{row.providerName}</div>
                              <div className="truncate text-xs text-slate-500">{row.providerCode}</div>
                            </div>
                          </td>
                          <td className="max-w-[260px] px-5 py-3 align-middle">
                            <div className="truncate whitespace-nowrap text-xs text-slate-500" title={row.resourceCodes.join(', ')}>
                              {row.resourceCodes.length > 0 ? row.resourceCodes.join(', ') : t('admin.group.channelBindings.noResourceCodes')}
                            </div>
                            <div className="mt-1 truncate whitespace-nowrap text-[11px] text-slate-400" title={row.capabilities.join(', ')}>
                              {row.capabilities.join(', ')}
                            </div>
                          </td>
                          <td className="max-w-[240px] px-5 py-3 align-middle">
                            <div className="truncate whitespace-nowrap text-xs text-slate-500" title={row.apiScope.join(', ')}>
                              {row.apiScope.length > 0 ? row.apiScope.join(', ') : t('admin.group.channelBindings.noApiScope')}
                            </div>
                          </td>
                          <td className="px-5 py-3 align-middle">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={draft?.priority ?? row.priority}
                              onChange={event => updateChannelBindingDraft(row.channelId, { priority: numericInputValue(event.currentTarget.value) })}
                              className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-[#202020] dark:text-white"
                            />
                          </td>
                          <td className="px-5 py-3 align-middle">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={draft?.weight ?? row.weight}
                              onChange={event => updateChannelBindingDraft(row.channelId, { weight: numericInputValue(event.currentTarget.value) })}
                              className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-[#202020] dark:text-white"
                            />
                          </td>
                          <td className="px-5 py-3 align-middle">
                            <select
                              value={draft?.status ?? row.status}
                              onChange={event => updateChannelBindingDraft(row.channelId, { status: event.currentTarget.value as GroupChannelBindingInput['status'] })}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-[#202020] dark:text-white"
                            >
                              <option value="active">{t('admin.group.channelBindings.status.active')}</option>
                              <option value="disabled">{t('admin.group.channelBindings.status.disabled')}</option>
                            </select>
                          </td>
                          <td className="px-5 py-3 align-middle">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${row.healthStatus === 'error' ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300'}`}>
                              {row.healthStatus === 'error' ? t('admin.group.channelBindings.health.error') : t('admin.group.channelBindings.health.active')}
                            </span>
                          </td>
                          <td className="px-5 py-3 align-middle text-right">
                            <button
                              data-admin-group-channel-binding-remove
                              type="button"
                              onClick={() => removeChannelBindingDraft(row.channelId)}
                              className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 transition-colors hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                              aria-label={t('admin.group.channelBindings.remove')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 p-5 dark:border-white/10">
              <button type="button" onClick={closeChannelBindingModal} disabled={bindingSaving} className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5">
                {t('admin.group.channelBindings.cancel')}
              </button>
              <button type="button" onClick={() => { void saveChannelBindings(); }} disabled={bindingSaving || bindingLoading} className="inline-flex items-center gap-2 rounded-xl border border-transparent bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-emerald-500 dark:hover:bg-emerald-400">
                <Save className="h-4 w-4" />
                {bindingSaving ? t('admin.group.channelBindings.saving') : t('admin.group.channelBindings.save')}
              </button>
            </div>
          </aside>
          <button
            type="button"
            aria-label={t('common.actions.closeDrawer')}
            className="flex-1 cursor-default"
            onClick={closeChannelBindingModal}
            disabled={bindingSaving}
          />
          {isChannelPickerOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
              <div data-admin-group-channel-picker-modal className="flex h-[86vh] max-h-[86vh] w-[92vw] max-w-7xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1a1a1a]">
                <div data-admin-group-channel-picker-header className="flex shrink-0 flex-col gap-4 border-b border-slate-200 p-5 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 lg:max-w-[280px]">
                    <h3 className="truncate text-lg font-bold text-slate-900 dark:text-white">
                      {t('admin.group.channelBindings.pickerTitle')}
                    </h3>
                    <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                      {t('admin.group.channelBindings.pickerSubtitle', { count: addableChannelCount, total: pickerTotal })}
                    </p>
                  </div>
                  <div className="relative w-full min-w-0 lg:max-w-xl">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      data-admin-group-channel-picker-search
                      type="text"
                      value={pickerSearchQuery}
                      onChange={event => {
                        setPickerSearchQuery(event.currentTarget.value);
                        setPickerPage(1);
                      }}
                      placeholder={t('admin.group.channelBindings.pickerSearchPlaceholder')}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 dark:border-white/10 dark:bg-[#202020] dark:text-white"
                    />
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-3 lg:justify-end">
                    <div data-admin-group-channel-picker-selected-count className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
                      {t('admin.group.channelBindings.selectedInPicker', { count: selectedPickerCount })}
                    </div>
                    <button onClick={closeChannelBindingPicker} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-auto">
                  {pickerLoading ? (
                    <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 px-6 text-center text-sm text-slate-500 dark:text-slate-400">
                      {t('admin.group.channelBindings.loading')}
                    </div>
                  ) : pickerChannels.length === 0 ? (
                    <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 px-6 text-center text-sm text-slate-500 dark:text-slate-400">
                      <div className="font-medium text-slate-700 dark:text-slate-200">{t('admin.group.channelBindings.pickerEmpty')}</div>
                      <div className="max-w-md text-xs leading-5">{t('admin.group.channelBindings.pickerEmptyDescription')}</div>
                    </div>
                  ) : (
                    <table className="w-full min-w-[860px] text-left text-sm text-slate-600 dark:text-slate-400">
                      <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 dark:border-white/10 dark:bg-[#121212] dark:text-slate-400">
                        <tr>
                          <th className="w-12 px-5 py-3"></th>
                          <th className="px-5 py-3">{t('admin.group.channelBindings.columns.channel')}</th>
                          <th className="px-5 py-3">{t('admin.group.channelBindings.columns.provider')}</th>
                          <th className="px-5 py-3">{t('admin.group.channelBindings.columns.resourceCodes')}</th>
                          <th className="px-5 py-3">{t('admin.group.channelBindings.columns.status')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                        {pickerChannels.map(channel => {
                          const isAlreadyBound = isChannelAlreadyBound(channel.id);
                          return (
                            <tr key={channel.id} className={`hover:bg-slate-50 dark:hover:bg-white/5 ${isAlreadyBound ? 'bg-slate-50/70 text-slate-400 dark:bg-white/[0.02] dark:text-slate-500' : ''}`}>
                              <td className="px-5 py-3 align-middle">
                                <input
                                  type="checkbox"
                                  checked={isAlreadyBound || Boolean(pickerSelection[channel.id])}
                                  disabled={isAlreadyBound}
                                  onChange={() => togglePickerSelection(channel.id)}
                                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                                />
                              </td>
                              <td className="max-w-[260px] px-5 py-3 align-middle">
                                <div className="flex min-w-0 items-center gap-2 whitespace-nowrap">
                                  <div className="min-w-0">
                                    <div className={`truncate font-medium ${isAlreadyBound ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>{channel.name}</div>
                                    <div className="truncate text-xs text-slate-500">{channel.channelCode}</div>
                                  </div>
                                  {isAlreadyBound && (
                                    <span data-admin-group-channel-picker-bound className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                                      {t('admin.group.channelBindings.alreadyAdded')}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="max-w-[200px] px-5 py-3 align-middle">
                                <div className="min-w-0 whitespace-nowrap">
                                  <div className={`truncate ${isAlreadyBound ? 'text-slate-500 dark:text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>{channel.providerName}</div>
                                  <div className="truncate text-xs text-slate-500">{channel.providerCode}</div>
                                </div>
                              </td>
                              <td className="max-w-[320px] px-5 py-3 align-middle">
                                <div className="truncate whitespace-nowrap text-xs text-slate-500" title={channel.resourceCodes.join(', ')}>
                                  {channel.resourceCodes.length > 0 ? channel.resourceCodes.join(', ') : t('admin.group.channelBindings.noResourceCodes')}
                                </div>
                                <div className="mt-1 truncate whitespace-nowrap text-[11px] text-slate-400" title={channel.apiScope.join(', ')}>
                                  {channel.apiScope.length > 0 ? channel.apiScope.join(', ') : t('admin.group.channelBindings.noApiScope')}
                                </div>
                                <div className="mt-1 truncate whitespace-nowrap text-[11px] text-slate-400" title={channel.capabilities.join(', ')}>
                                  {channel.capabilities.join(', ')}
                                </div>
                              </td>
                              <td className="px-5 py-3 align-middle">
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${channel.status === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'}`}>
                                  {channel.status === 'active' ? t('admin.group.channelBindings.status.active') : t('admin.group.channelBindings.status.disabled')}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 p-5 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between">
                  <div data-admin-group-channel-picker-pagination className="flex flex-col gap-2 text-xs text-slate-500 dark:text-slate-400 sm:flex-row sm:items-center">
                    <span>
                      {t('admin.group.channelBindings.pagination', {
                        end: pickerEndIndex,
                        page: pickerPage,
                        start: pickerStartIndex,
                        total: pickerTotal,
                        totalPages: pickerTotalPages,
                      })}
                    </span>
                    <div className="inline-flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-[#202020]">
                      <button
                        type="button"
                        aria-label={t('common.actions.previousPage')}
                        title={t('common.actions.previousPage')}
                        onClick={() => setPickerPage(current => Math.max(1, current - 1))}
                        disabled={pickerPage <= 1}
                        className="inline-flex h-8 w-8 items-center justify-center text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="border-x border-slate-200 px-3 text-xs font-medium text-slate-700 dark:border-white/10 dark:text-slate-200">
                        {pickerPage} / {pickerTotalPages}
                      </span>
                      <button
                        type="button"
                        aria-label={t('common.actions.nextPage')}
                        title={t('common.actions.nextPage')}
                        onClick={() => setPickerPage(current => Math.min(pickerTotalPages, current + 1))}
                        disabled={pickerPage >= pickerTotalPages}
                        className="inline-flex h-8 w-8 items-center justify-center text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={closeChannelBindingPicker} className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5">
                      {t('admin.group.channelBindings.cancel')}
                    </button>
                    <button type="button" onClick={addSelectedChannelBindings} disabled={selectedPickerCount === 0} className="inline-flex items-center gap-2 rounded-xl border border-transparent bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-emerald-500 dark:hover:bg-emerald-400">
                      <Plus className="h-4 w-4" />
                      {t('admin.group.channelBindings.addSelected', { count: selectedPickerCount })}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {priceSettingsTarget && (
        <div className="fixed inset-0 z-50 flex justify-start bg-slate-900/40 backdrop-blur-sm">
          <aside data-admin-group-price-settings-drawer className="flex h-full w-[90vw] max-w-[90vw] flex-col overflow-hidden border-r border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1a1a1a]">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 p-5 dark:border-white/10">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-bold text-slate-900 dark:text-white">
                  {t('admin.group.priceSettings.title')}
                </h3>
                <div className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                  {priceSettingsTarget.groupName}
                </div>
              </div>
              <button onClick={closePriceSettingsDrawer} className="text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-5">
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/10">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-white/10 dark:bg-[#121212] dark:text-slate-400">
                    <tr>
                      <th className="px-5 py-3">{t('admin.group.priceSettings.columns.resourceCategory')}</th>
                      <th className="px-5 py-3">{t('admin.group.priceSettings.columns.scope')}</th>
                      <th className="px-5 py-3">{t('admin.group.priceSettings.columns.formula')}</th>
                      <th className="px-5 py-3 text-right">{t('admin.group.priceSettings.columns.multiplier')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                    {pricingResourceCategories.map((category) => (
                      <tr key={category.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                        <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">
                          {t(`admin.group.priceSettings.resourceCategory.${category.id}`)}
                        </td>
                        <td className="px-5 py-4">
                          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-white/10 dark:text-slate-300">
                            {t('admin.group.priceSettings.scope.category')}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {t('admin.group.priceSettings.formula.officialMultiplier')}
                        </td>
                        <td className="px-5 py-4 text-right font-mono">
                          {category.defaultMultiplier.toFixed(2)}x
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#121212]">
              <button type="button" onClick={closePriceSettingsDrawer} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5">
                {t('common.actions.close')}
              </button>
            </div>
          </aside>
          <button
            type="button"
            aria-label={t('common.actions.closeDrawer')}
            className="flex-1"
            onClick={closePriceSettingsDrawer}
          />
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete AI channel group?"
          description={`This removes "${deleteTarget.groupName}" from AI channel group configuration. Verify related routing and billing policies before confirming.`}
          confirmLabel="Delete group"
          tone="danger"
          icon={<Trash2 className="h-4 w-4" />}
          isBusy={deletingGroupId === deleteTarget.id}
          onConfirm={() => void executeDelete()}
          onCancel={closeDeleteConfirmation}
        />
      )}
    </div>
  );
}

function formatGroupMultiplier(group: GroupData): string {
  const value = group.priceReferenceMode === 'official_price'
    ? group.officialPriceMultiplier ?? group.rateMultiplier
    : group.rateMultiplier;
  return value.toFixed(2);
}

function displayGroupPriceReferenceMode(
  mode: GroupData['priceReferenceMode'],
  t: ReturnType<typeof useTranslation>['t'],
): string {
  return mode === 'official_price'
    ? t('admin.group.priceReferenceMode.officialPrice')
    : t('admin.group.priceReferenceMode.multiplier');
}

function displayGroupType(type: GroupData['groupType'], t: ReturnType<typeof useTranslation>['t']): string {
  return type === 'dedicated' ? t('admin.group.groupType.dedicated') : t('admin.group.groupType.public');
}

function bindingsToDraft(bindings: GroupChannelBindingData[]): Record<string, GroupChannelBindingInput> {
  return Object.fromEntries(
    bindings.map(binding => [
      binding.channelId,
      {
        channelId: binding.channelId,
        priority: binding.priority,
        weight: binding.weight,
        status: binding.status,
        resourceCodes: binding.resourceCodes,
        apiScope: binding.apiScope,
        capabilities: binding.capabilities,
      },
    ]),
  );
}

function numericInputValue(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : 0;
}

function matchesChannelSearch(query: string, values: string[]): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }
  return values.some(value => value.toLowerCase().includes(normalizedQuery));
}

function displayGroupStatus(status: GroupData['status'], t: ReturnType<typeof useTranslation>['t']): string {
  return status === 'disabled' ? t('common.status.disabled') : t('common.status.active');
}

function toResourceGroupSummaryItem(
  code: string,
  option: GroupResourceGroupOption | undefined,
  t: TranslationFunction,
): ResourceAccessSummaryItem {
  return {
    kind: 'resourceGroup',
    code,
    title: option?.groupName ?? code,
    subtitle: option?.description ?? code,
    meta: [
      option?.status ?? '-',
      t('admin.group.resourceAccess.detail.resourceCountValue', { count: option?.resourceCount ?? 0 }),
    ],
    details: [
      { label: t('admin.group.resourceAccess.columns.resourceGroup'), value: option?.groupName ?? code },
      { label: t('admin.group.resourceAccess.detail.code'), value: code },
      { label: t('admin.group.resourceAccess.columns.status'), value: option?.status ?? '-' },
      { label: t('admin.group.resourceAccess.columns.resourceCount'), value: String(option?.resourceCount ?? 0) },
      { label: t('admin.group.resourceAccess.detail.selectionMode'), value: option?.selectionMode ?? '-' },
      { label: t('admin.group.resourceAccess.detail.description'), value: option?.description ?? '-' },
    ],
  };
}

function toAiResourceSummaryItem(
  code: string,
  option: GroupAiResourceOption | undefined,
  t: TranslationFunction,
): ResourceAccessSummaryItem {
  return {
    kind: 'resource',
    code,
    title: option?.displayName ?? code,
    subtitle: option?.resourceType ?? code,
    meta: [
      option?.status ?? '-',
      option?.vendorCode ?? '-',
      option?.modalityCode ?? '-',
    ],
    details: [
      { label: t('admin.group.resourceAccess.columns.resource'), value: option?.displayName ?? code },
      { label: t('admin.group.resourceAccess.detail.code'), value: code },
      { label: t('admin.group.resourceAccess.columns.kind'), value: option?.resourceType ?? '-' },
      { label: t('admin.group.resourceAccess.columns.vendor'), value: option?.vendorCode ?? '-' },
      { label: t('admin.group.resourceAccess.detail.modality'), value: option?.modalityCode ?? '-' },
      { label: t('admin.group.resourceAccess.detail.endpoint'), value: option?.apiEndpointCode ?? '-' },
      { label: t('admin.group.resourceAccess.detail.catalogKey'), value: option?.catalogKey ?? '-' },
      { label: t('admin.group.resourceAccess.detail.model'), value: option?.model ?? '-' },
      { label: t('admin.group.resourceAccess.detail.providerNativeModel'), value: option?.providerNativeModel ?? '-' },
      { label: t('admin.group.resourceAccess.columns.status'), value: option?.status ?? '-' },
    ],
  };
}

function ResourceAccessSummary({
  emptyText,
  items,
  onDetail,
  onOpen,
  onRemove,
  rowDataAttribute,
  t,
}: {
  emptyText: string;
  items: ResourceAccessSummaryItem[];
  onDetail: (item: ResourceAccessSummaryItem) => void;
  onOpen: () => void;
  onRemove: (code: string) => void;
  rowDataAttribute: string;
  t: TranslationFunction;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-[#121212]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 text-xs text-slate-500 dark:text-slate-400">
          {items.length === 0 ? emptyText : t('admin.group.resourceAccess.selectedCount', { count: items.length })}
        </div>
        <button type="button" onClick={onOpen} className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400">
          {t('admin.group.resourceAccess.actions.select')}
        </button>
      </div>
      {items.length > 0 && (
        <div className="mt-3 space-y-2">
          {items.map(item => (
            <div
              key={item.code}
              data-admin-group-selected-resource-row="true"
              {...{ [rowDataAttribute]: 'true' }}
              className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-white/10 dark:bg-[#1a1a1a]"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-900 dark:text-white">{item.title}</div>
                <div className="mt-0.5 truncate font-mono text-xs text-slate-500 dark:text-slate-400">{item.code}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {item.meta.filter(value => value && value !== '-').map(value => (
                    <span key={value} className="max-w-full truncate rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 dark:bg-white/10 dark:text-slate-400">
                      {value}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onDetail(item)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                >
                  <Info className="h-3.5 w-3.5" />
                  {t('admin.group.resourceAccess.actions.details')}
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(item.code)}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-500/20 dark:text-rose-300 dark:hover:bg-rose-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('admin.group.resourceAccess.actions.remove')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ResourceAccessDetailModal({
  item,
  onClose,
  t,
}: {
  item: ResourceAccessSummaryItem;
  onClose: () => void;
  t: TranslationFunction;
}) {
  const title = item.kind === 'resourceGroup'
    ? t('admin.group.resourceAccess.detail.resourceGroupTitle')
    : t('admin.group.resourceAccess.detail.resourceTitle');

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div data-admin-group-resource-access-detail-modal className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1a1a1a]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-white/10">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
            <div className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{item.title}</div>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {item.details.map(detail => (
              <div key={detail.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-[#121212]">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{detail.label}</div>
                <div className="mt-1 break-words text-sm text-slate-900 dark:text-white">{detail.value}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end border-t border-slate-200 p-5 dark:border-white/10">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5">
            {t('common.actions.close')}
          </button>
        </div>
      </div>
    </div>
  );
}

function toggleSelectionCode(
  selectedCodes: string[],
  code: string,
  selectionMode: ResourceSelectorSelectionMode,
): string[] {
  const normalized = code.trim();
  if (!normalized) {
    return selectedCodes;
  }
  const selected = new Set(selectedCodes);
  if (selectionMode === 'single') {
    return selected.has(normalized) ? [] : [normalized];
  }
  return selected.has(normalized)
    ? selectedCodes.filter(item => item !== normalized)
    : [...selectedCodes, normalized];
}

function ResourceGroupSelectorModal({
  loading,
  onChange,
  onClose,
  onPageChange,
  onSearchChange,
  options,
  page,
  searchQuery,
  selectedCodes,
  selectionMode = 'single',
  total,
  totalPages,
  t,
}: {
  loading: boolean;
  onChange: (codes: string[]) => void;
  onClose: () => void;
  onPageChange: (page: number) => void;
  onSearchChange: (value: string) => void;
  options: GroupResourceGroupOption[];
  page: number;
  searchQuery: string;
  selectedCodes: string[];
  selectionMode?: ResourceSelectorSelectionMode;
  total: number;
  totalPages: number;
  t: TranslationFunction;
}) {
  const selected = new Set(selectedCodes);
  const toggleCode = (code: string) => {
    onChange(toggleSelectionCode(selectedCodes, code, selectionMode));
  };
  const startIndex = total === 0 ? 0 : (page - 1) * RESOURCE_GROUP_PICKER_PAGE_SIZE + 1;
  const endIndex = Math.min(total, page * RESOURCE_GROUP_PICKER_PAGE_SIZE);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="flex h-[76vh] max-h-[76vh] w-[88vw] max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1a1a1a]">
        <SelectorHeader
          title={t('admin.group.resourceAccess.resourceGroupSelectorTitle')}
          onClose={onClose}
        />
        <div className="shrink-0 border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              data-admin-group-resource-group-selector-search="true"
              type="search"
              value={searchQuery}
              onChange={event => onSearchChange(event.currentTarget.value)}
              aria-label={t('admin.group.resourceAccess.search.resourceGroupsPlaceholder')}
              placeholder={t('admin.group.resourceAccess.search.resourceGroupsPlaceholder')}
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white dark:border-white/10 dark:bg-[#121212] dark:text-white dark:focus:border-emerald-500"
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {loading ? (
            <SelectorState text={t('admin.group.resourceAccess.loading')} />
          ) : total === 0 ? (
            <SelectorState text={searchQuery.trim().length > 0
              ? t('admin.group.resourceAccess.emptyResourceGroupsSearch')
              : t('admin.group.resourceAccess.emptyResourceGroups')} />
          ) : options.length === 0 ? (
            <SelectorState text={t('admin.group.resourceAccess.emptyResourceGroupsSearch')} />
          ) : (
            <table className="w-full min-w-[720px] text-left text-sm text-slate-600 dark:text-slate-400">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 dark:border-white/10 dark:bg-[#121212] dark:text-slate-400">
                <tr>
                  <th className="w-12 px-5 py-3"></th>
                  <th className="px-5 py-3">{t('admin.group.resourceAccess.columns.resourceGroup')}</th>
                  <th className="px-5 py-3">{t('admin.group.resourceAccess.columns.resourceCount')}</th>
                  <th className="px-5 py-3">{t('admin.group.resourceAccess.columns.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {options.map(option => (
                  <tr key={option.groupCode} className="hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="px-5 py-3">
                      <input
                        type={selectionMode === 'multiple' ? 'checkbox' : 'radio'}
                        checked={selected.has(option.groupCode)}
                        onChange={() => toggleCode(option.groupCode)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">{option.groupName}</div>
                      <div className="font-mono text-xs text-slate-500">{option.groupCode}</div>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">{option.resourceCount}</td>
                    <td className="px-5 py-3">{option.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 p-5 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between">
          <div data-admin-group-resource-group-selector-pagination className="flex flex-col gap-2 text-xs text-slate-500 dark:text-slate-400 sm:flex-row sm:items-center">
            <span>
              {t('admin.group.resourceAccess.pagination', {
                end: endIndex,
                page,
                start: startIndex,
                total,
                totalPages,
                defaultValue: `${startIndex}-${endIndex} of ${total}`,
              })}
            </span>
            <div className="inline-flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-[#202020]">
              <button
                type="button"
                aria-label={t('common.actions.previousPage')}
                title={t('common.actions.previousPage')}
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page <= 1 || loading}
                className="inline-flex h-8 w-8 items-center justify-center text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="border-x border-slate-200 px-3 text-xs font-medium text-slate-700 dark:border-white/10 dark:text-slate-200">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                aria-label={t('common.actions.nextPage')}
                title={t('common.actions.nextPage')}
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages || loading}
                className="inline-flex h-8 w-8 items-center justify-center text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <SelectorFooter count={selectedCodes.length} onClose={onClose} t={t} />
        </div>
      </div>
    </div>
  );
}

function PaginatedAiResourceSelectorModal({
  loading,
  onChange,
  onClose,
  onPageChange,
  onSearchChange,
  options,
  page,
  searchQuery,
  selectedCodes,
  selectionMode = 'single',
  total,
  totalPages,
  t,
}: {
  loading: boolean;
  onChange: (codes: string[]) => void;
  onClose: () => void;
  onPageChange: (page: number) => void;
  onSearchChange: (value: string) => void;
  options: GroupAiResourceOption[];
  page: number;
  searchQuery: string;
  selectedCodes: string[];
  selectionMode?: ResourceSelectorSelectionMode;
  total: number;
  totalPages: number;
  t: TranslationFunction;
}) {
  const selected = new Set(selectedCodes);
  const toggleCode = (code: string) => {
    onChange(toggleSelectionCode(selectedCodes, code, selectionMode));
  };
  const startIndex = total === 0 ? 0 : (page - 1) * RESOURCE_PICKER_PAGE_SIZE + 1;
  const endIndex = Math.min(total, page * RESOURCE_PICKER_PAGE_SIZE);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="flex h-[76vh] max-h-[76vh] w-[88vw] max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1a1a1a]">
        <SelectorHeader
          title={t('admin.group.resourceAccess.resourceSelectorTitle')}
          onClose={onClose}
        />
        <div className="shrink-0 border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              data-admin-group-resource-selector-search="true"
              type="search"
              value={searchQuery}
              onChange={event => onSearchChange(event.currentTarget.value)}
              aria-label={t('admin.group.resourceAccess.search.resourcesPlaceholder')}
              placeholder={t('admin.group.resourceAccess.search.resourcesPlaceholder')}
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white dark:border-white/10 dark:bg-[#121212] dark:text-white dark:focus:border-emerald-500"
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {loading ? (
            <SelectorState text={t('admin.group.resourceAccess.loading')} />
          ) : total === 0 ? (
            <SelectorState text={searchQuery.trim().length > 0
              ? t('admin.group.resourceAccess.emptyResourcesSearch')
              : t('admin.group.resourceAccess.emptyResources')} />
          ) : options.length === 0 ? (
            <SelectorState text={t('admin.group.resourceAccess.emptyResourcesSearch')} />
          ) : (
            <table className="w-full min-w-[860px] text-left text-sm text-slate-600 dark:text-slate-400">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 dark:border-white/10 dark:bg-[#121212] dark:text-slate-400">
                <tr>
                  <th className="w-12 px-5 py-3"></th>
                  <th className="px-5 py-3">{t('admin.group.resourceAccess.columns.resource')}</th>
                  <th className="px-5 py-3">{t('admin.group.resourceAccess.columns.kind')}</th>
                  <th className="px-5 py-3">{t('admin.group.resourceAccess.columns.vendor')}</th>
                  <th className="px-5 py-3">{t('admin.group.resourceAccess.columns.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {options.map(option => (
                  <tr key={option.resourceCode} className="hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="px-5 py-3">
                      <input
                        type={selectionMode === 'multiple' ? 'checkbox' : 'radio'}
                        checked={selected.has(option.resourceCode)}
                        onChange={() => toggleCode(option.resourceCode)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">{option.displayName}</div>
                      <div className="font-mono text-xs text-slate-500">{option.resourceCode}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                        {option.resourceType}
                      </span>
                    </td>
                    <td className="px-5 py-3">{option.vendorCode ?? '-'}</td>
                    <td className="px-5 py-3">{option.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 p-5 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between">
          <div data-admin-group-resource-selector-pagination className="flex flex-col gap-2 text-xs text-slate-500 dark:text-slate-400 sm:flex-row sm:items-center">
            <span>
              {t('admin.group.resourceAccess.pagination', {
                end: endIndex,
                page,
                start: startIndex,
                total,
                totalPages,
                defaultValue: `${startIndex}-${endIndex} of ${total}`,
              })}
            </span>
            <div className="inline-flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-[#202020]">
              <button
                type="button"
                aria-label={t('common.actions.previousPage')}
                title={t('common.actions.previousPage')}
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page <= 1 || loading}
                className="inline-flex h-8 w-8 items-center justify-center text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="border-x border-slate-200 px-3 text-xs font-medium text-slate-700 dark:border-white/10 dark:text-slate-200">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                aria-label={t('common.actions.nextPage')}
                title={t('common.actions.nextPage')}
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages || loading}
                className="inline-flex h-8 w-8 items-center justify-center text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <SelectorFooter count={selectedCodes.length} onClose={onClose} t={t} />
        </div>
      </div>
    </div>
  );
}

function SelectorHeader({
  onClose,
  title,
}: {
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 p-5 dark:border-white/10">
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
      </div>
      <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200">
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

function SelectorState({ text }: { text: string }) {
  return (
    <div className="flex min-h-[240px] items-center justify-center px-6 text-center text-sm text-slate-500 dark:text-slate-400">
      {text}
    </div>
  );
}

function SelectorFooter({
  count,
  onClose,
  t,
}: {
  count: number;
  onClose: () => void;
  t: TranslationFunction;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 p-5 dark:border-white/10">
      <div className="min-w-0 text-sm text-slate-500 dark:text-slate-400">
        {t('admin.group.resourceAccess.selectedCount', { count })}
      </div>
      <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5">
        {t('common.actions.done')}
      </button>
    </div>
  );
}
