import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Edit, Key, MoreHorizontal, Plus, RefreshCw, Search, Shield, Users, X } from 'lucide-react';
import { AdminTableShell, BusinessStateTableRow, CopyButton } from '@sdkwork/clawroutes-pc-commons';
import { ApiKeyItem, UserListItem, UserService } from './userService';
import {
  createApiKeyInputFromForm,
  createUserGroupUpdateInputFromForm,
  createUserInputFromForm,
  createUserProfileUpdateInputFromForm,
  createUserStatusUpdateInput,
} from './userForm';
import { useTranslation } from 'react-i18next';

type TranslationFunction = ReturnType<typeof useTranslation>['t'];

function getAdminUserErrorMessage(error: unknown, fallbackKey: string, fallback: string, t: TranslationFunction): string {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message.startsWith('admin.user.')) {
      return t(message, fallback);
    }
    if (message) {
      return message;
    }
  }
  return t(fallbackKey, fallback);
}

function createDefaultUserGroupOptions(t: TranslationFunction) {
  return [
    { value: 'default', label: t('admin.user.groups.default', 'default (Default group)') },
    { value: 'vip', label: t('admin.user.groups.vip', 'VIP (Advanced users)') },
    { value: 'svip', label: t('admin.user.groups.svip', 'SVIP (Premium users)') },
    { value: 'member', label: t('admin.user.groups.member', 'member (Standard member)') },
    { value: 'operator', label: t('admin.user.groups.operator', 'operator (Operations user)') },
  ] as const;
}

function getStatusToggleLabel(u: UserListItem, t: TranslationFunction): string {
  return u.status === 'active' ? t('admin.user.index.actions.disable', 'Disable') : t('common.actions.enable', 'Enable');
}

function getUserRoleLabel(role: string, t: TranslationFunction): string {
  if (role === 'admin') {
    return t('admin.user.roles.admin', 'Admin');
  }
  if (role === 'user') {
    return t('admin.user.roles.user', 'User');
  }
  return role || '-';
}

function getUserGroupLabel(group: string, defaultUserGroupOptions: ReadonlyArray<{ value: string; label: string }>): string {
  if (!group) {
    return '-';
  }
  return defaultUserGroupOptions.find((option) => option.value === group)?.label ?? group;
}

function getUserStatusLabel(status: UserListItem['status'], t: TranslationFunction): string {
  if (status === 'active') {
    return t('admin.user.status.active', 'Active');
  }
  if (status === 'banned') {
    return t('admin.user.status.banned', 'Banned');
  }
  return status || '-';
}

function getUserGenderLabel(gender: string, t: TranslationFunction): string {
  const normalized = gender.trim().toLowerCase();
  if (!normalized) {
    return '-';
  }
  if (normalized === 'male' || normalized === 'm') {
    return t('admin.user.gender.male', 'Male');
  }
  if (normalized === 'female' || normalized === 'f') {
    return t('admin.user.gender.female', 'Female');
  }
  if (normalized === 'unknown' || normalized === 'unspecified') {
    return t('admin.user.gender.unknown', 'Unknown');
  }
  return gender;
}

function formatUserRegion(user: UserListItem): string {
  const region = [user.country, user.province, user.city, user.district].filter(Boolean).join(' / ');
  return region || '-';
}

function formatUserPrimaryLabel(user: UserListItem): string {
  return user.displayName || user.email || user.username || user.id;
}

function displayValue(value: string | null | undefined): string {
  return value?.trim() || '-';
}

function getApiKeyStatusLabel(status: string, t: TranslationFunction): string {
  if (status === 'active') {
    return t('admin.user.apiKeyStatus.active', 'Active');
  }
  if (status === 'disabled') {
    return t('admin.user.apiKeyStatus.disabled', 'Disabled');
  }
  if (status === 'inactive') {
    return t('admin.user.apiKeyStatus.inactive', 'Inactive');
  }
  if (status === 'revoked') {
    return t('admin.user.apiKeyStatus.revoked', 'Revoked');
  }
  return status || '-';
}

export function UserAdmin() {
  const { t } = useTranslation();
  const defaultUserGroupOptions = createDefaultUserGroupOptions(t);
  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserListItem | null>(null);
  const [apiKeysTarget, setApiKeysTarget] = useState<UserListItem | null>(null);
  const [groupsTarget, setGroupsTarget] = useState<UserListItem | null>(null);
  const [isCreateApiKeyModalOpen, setIsCreateApiKeyModalOpen] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [apiKeysLoadError, setApiKeysLoadError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [apiKeysMap, setApiKeysMap] = useState<Record<string, ApiKeyItem[]>>({});

  const loadUsers = async (searchText = appliedSearch) => {
    const normalizedSearchText = searchText.trim();
    setLoading(true);
    setLoadError(null);
    setApiKeysLoadError(null);
    try {
      const result = await UserService.loadAdminTableData({
        q: normalizedSearchText || undefined,
        pageSize: 200,
      });
      setUsers(result.users);
      setApiKeysMap(result.apiKeysMap);
      setAppliedSearch(normalizedSearchText);
      setApiKeysLoadError(
        result.apiKeysLoadError
          ? getAdminUserErrorMessage(result.apiKeysLoadError, 'admin.user.errors.fetchApiKeysFallback', 'API keys could not be loaded', t)
          : null,
      );
    } catch (error) {
      setLoadError(getAdminUserErrorMessage(error, 'admin.user.errors.loadUsersFallback', 'Users could not be loaded', t));
    } finally {
      setLoading(false);
    }
  };

  const ensureApiKeysLoaded = async (target: UserListItem) => {
    setApiKeysTarget(target);
    if ((apiKeysMap[target.id] ?? []).length > 0) {
      return;
    }
    try {
      const fetchedApiKeys = await UserService.fetchApiKeysMap();
      setApiKeysMap(fetchedApiKeys);
      setApiKeysLoadError(null);
    } catch (error) {
      setApiKeysLoadError(getAdminUserErrorMessage(error, 'admin.user.errors.fetchApiKeysFallback', 'API keys could not be loaded', t));
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddUser = async (event: React.FormEvent) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const user = await UserService.addUser(createUserInputFromForm(formData));
    setUsers((currentUsers) => [user, ...currentUsers]);
    setIsModalOpen(false);
  };

  const handleEditUserSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editTarget) return;
    const formData = new FormData(event.target as HTMLFormElement);
    const updatedUser = await UserService.updateUser(editTarget.id, createUserProfileUpdateInputFromForm(formData));
    setUsers((currentUsers) => currentUsers.map((user) => (user.id === updatedUser.id ? updatedUser : user)));
    setEditTarget(null);
  };

  const handleCreateApiKeySubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!apiKeysTarget) return;
    const formData = new FormData(event.target as HTMLFormElement);
    const { key, rawKey } = await UserService.createApiKey(createApiKeyInputFromForm(formData, apiKeysTarget.id));
    setApiKeysMap((currentApiKeysMap) => ({
      ...currentApiKeysMap,
      [apiKeysTarget.id]: [...(currentApiKeysMap[apiKeysTarget.id] ?? []), key],
    }));
    setNewlyCreatedKey(rawKey);
    setIsCreateApiKeyModalOpen(false);
  };

  const deleteApiKey = async (keyId: string) => {
    if (!apiKeysTarget) return;
    await UserService.deleteApiKey(apiKeysTarget.id, keyId);
    setApiKeysMap((currentApiKeysMap) => ({
      ...currentApiKeysMap,
      [apiKeysTarget.id]: (currentApiKeysMap[apiKeysTarget.id] ?? []).filter((key) => key.id !== keyId),
    }));
  };

  const handleGroupSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!groupsTarget) return;
    const formData = new FormData(event.target as HTMLFormElement);
    const updatedUser = await UserService.updateUser(groupsTarget.id, createUserGroupUpdateInputFromForm(formData));
    setUsers((currentUsers) => currentUsers.map((user) => (user.id === updatedUser.id ? updatedUser : user)));
    setGroupsTarget(null);
  };

  const handleStatusToggle = async (target: UserListItem) => {
    const nextStatus = target.status === 'active' ? 'banned' : 'active';
    const updatedUser = await UserService.updateUser(target.id, createUserStatusUpdateInput(nextStatus));
    setUsers((currentUsers) => currentUsers.map((user) => (user.id === updatedUser.id ? updatedUser : user)));
    setActiveDropdown(null);
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden">
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" data-admin-user-toolbar>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72" data-admin-user-search>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-500 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-[#1e1e1e] dark:text-white"
              onChange={(event) => setSearchDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void loadUsers(searchDraft);
                }
              }}
              placeholder={t('admin.user.index.searchPlaceholder', 'Search users...')}
              type="text"
              value={searchDraft}
            />
          </div>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-blue-300 hover:text-blue-700 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-slate-200 dark:hover:border-blue-500/40 dark:hover:text-blue-300"
            data-admin-user-query-action
            onClick={() => { void loadUsers(searchDraft); }}
            type="button"
          >
            <Search className="h-4 w-4" />
            <span>{t('admin.user.index.actions.query', 'Query')}</span>
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-blue-300 hover:text-blue-700 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-slate-200 dark:hover:border-blue-500/40 dark:hover:text-blue-300"
            data-admin-user-refresh-action
            onClick={() => { void loadUsers(appliedSearch); }}
            type="button"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{t('admin.user.index.actions.refresh', 'Refresh')}</span>
          </button>
        </div>
          <button
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            data-admin-user-primary-action
            onClick={() => setIsModalOpen(true)}
            type="button"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t('admin.user.index.createUser', 'Create user')}</span>
          </button>
      </div>

      <AdminTableShell
        className="flex-1 min-h-0 rounded-xl dark:bg-[#1a1a1a]"
        data-admin-user-table-card
        onClick={() => setActiveDropdown(null)}
        viewportClassName="min-h-0 flex-1"
        viewportProps={{ 'data-admin-user-table-viewport': true }}
      >
        <table className="w-full min-w-[1320px] text-left text-sm text-slate-600 dark:text-slate-400">
          <thead className="sticky top-0 z-10 select-none border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 dark:border-white/10 dark:bg-[#121212] dark:text-slate-400">
            <tr>
              <th className="px-6 py-4">{t('admin.user.index.columns.user', 'User')}</th>
              <th className="px-6 py-4">{t('admin.user.index.columns.id', 'ID')}</th>
              <th className="px-6 py-4">{t('admin.user.index.columns.username', 'Username')}</th>
              <th className="px-6 py-4">{t('admin.user.index.columns.contact', 'Contact')}</th>
              <th className="px-6 py-4">{t('admin.user.index.columns.region', 'Region')}</th>
              <th className="px-6 py-4">{t('admin.user.index.columns.gender', 'Gender')}</th>
              <th className="px-6 py-4">{t('admin.user.index.columns.role', 'Role')}</th>
              <th className="px-6 py-4">{t('admin.user.index.columns.group', 'Group')}</th>
              <th className="px-6 py-4">{t('admin.user.index.columns.status', 'Status')}</th>
              <th className="px-6 py-4">{t('admin.user.index.columns.lastActive', 'Last active')}</th>
              <th className="px-6 py-4">{t('admin.user.index.columns.lastUsed', 'Last used')}</th>
              <th className="px-6 py-4">{t('admin.user.index.columns.createdAt', 'Created')}</th>
              <th className="px-6 py-4 text-right">{t('admin.user.index.columns.actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/5">
            {loading ? (
              <BusinessStateTableRow colSpan={13} kind="loading" title={t('admin.user.index.text.loadingUsers', 'Loading users...')} />
            ) : loadError ? (
              <BusinessStateTableRow
                colSpan={13}
                description={loadError}
                kind="error"
                onRetry={() => { void loadUsers(appliedSearch); }}
                retryLabel={t('admin.user.index.text.usersRetry', 'Retry')}
                title={t('admin.user.index.text.usersLoadError', 'Users could not be loaded')}
              />
            ) : users.length === 0 ? (
              <BusinessStateTableRow
                colSpan={13}
                description={t('admin.user.index.text.usersEmptyDescription', 'Create a user before assigning groups, balances, or API keys.')}
                kind="empty"
                title={t('admin.user.index.text.usersEmpty', 'No users found')}
              />
            ) : users.map((userItem) => (
              <tr className="group transition-colors hover:bg-slate-50 dark:hover:bg-white/5" key={userItem.id}>
                <td className="px-6 py-4">
                  <div className="flex w-48 items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                      {formatUserPrimaryLabel(userItem).charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate font-semibold text-slate-900 dark:text-white">{formatUserPrimaryLabel(userItem)}</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-mono text-xs">{userItem.id}</td>
                <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{displayValue(userItem.username)}</td>
                <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                  <div>{displayValue(userItem.email)}</div>
                  <div className="text-xs text-slate-500">{displayValue(userItem.mobile)}</div>
                </td>
                <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{formatUserRegion(userItem)}</td>
                <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{getUserGenderLabel(userItem.gender, t)}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${userItem.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400' : 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300'}`}>
                    {getUserRoleLabel(userItem.role, t)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                    {getUserGroupLabel(userItem.group, defaultUserGroupOptions)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                    <span className={`h-2 w-2 rounded-full ${userItem.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    {getUserStatusLabel(userItem.status, t)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-slate-500 dark:text-slate-400">{displayValue(userItem.lastActive)}</td>
                <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-slate-500 dark:text-slate-400">{displayValue(userItem.lastUsed)}</td>
                <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-slate-500 dark:text-slate-400">{displayValue(userItem.createdAt)}</td>
                <td className="px-6 py-4 text-right">
                  <div className="relative flex items-center justify-end gap-2 text-slate-400">
                    <button
                      className="rounded p-1.5 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditTarget(userItem);
                      }}
                      title={t('admin.user.index.edit', 'Edit')}
                      type="button"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      className={`flex items-center gap-1 rounded p-1.5 transition-colors ${activeDropdown === userItem.id ? 'bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white' : 'hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white'}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setActiveDropdown(activeDropdown === userItem.id ? null : userItem.id);
                      }}
                      title={t('admin.user.index.more', 'More')}
                      type="button"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>

                    {activeDropdown === userItem.id && (
                      <div
                        className="absolute right-0 top-10 z-50 flex w-40 flex-col divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:divide-white/5 dark:border-[#333] dark:bg-[#1e1e1e]"
                        onClick={(event) => event.stopPropagation()}
                        ref={dropdownRef}
                      >
                        <div className="py-1">
                          <button
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
                            onClick={() => {
                              void ensureApiKeysLoaded(userItem);
                              setActiveDropdown(null);
                            }}
                            type="button"
                          >
                            <Key className="h-4 w-4 text-slate-400" />
                            {t('admin.user.index.apiKeys', 'API keys')}
                          </button>
                          <button
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
                            onClick={() => {
                              setGroupsTarget(userItem);
                              setActiveDropdown(null);
                            }}
                            type="button"
                          >
                            <Users className="h-4 w-4 text-slate-400" />
                            {t('admin.user.index.groups', 'Groups')}
                          </button>
                        </div>
                        <div className="py-1">
                          <button
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
                            onClick={() => { void handleStatusToggle(userItem); }}
                            type="button"
                          >
                            <Shield className="h-4 w-4 text-slate-400" />
                            {getStatusToggleLabel(userItem, t)}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTableShell>

      <div className="grid shrink-0 gap-1 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-[auto_auto_1fr] sm:gap-3">
        <span>{t('admin.user.index.text.recordsEmptyRecharge', 'No recharge records loaded')}</span>
        <span>{t('admin.user.index.text.recordsEmptyExchange', 'No exchange records loaded')}</span>
        <span>
          {t(
            'admin.user.index.text.recordsEmptyDescription',
            'Records are available from the billing history and recharge records modules; this user dialog does not synthesize transaction rows.',
          )}
        </span>
      </div>

      {isModalOpen && (
        <UserProfileModal
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleAddUser}
          title={t('admin.user.index.createUser', 'Create user')}
          t={t}
        />
      )}

      {editTarget && (
        <UserProfileModal
          defaultUsername={editTarget.username !== '-' ? editTarget.username : ''}
          email={editTarget.email}
          onClose={() => setEditTarget(null)}
          onSubmit={handleEditUserSubmit}
          title={t('admin.user.index.editUserTitle', 'Edit user - {{email}}', { email: editTarget.email })}
          t={t}
        />
      )}

      {apiKeysTarget && (
        <ApiKeysModal
          apiKeys={apiKeysMap[apiKeysTarget.id] ?? []}
          apiKeysLoadError={apiKeysLoadError}
          onClose={() => setApiKeysTarget(null)}
          onCreate={() => setIsCreateApiKeyModalOpen(true)}
          onDelete={(keyId) => { void deleteApiKey(keyId); }}
          target={apiKeysTarget}
          t={t}
        />
      )}

      {groupsTarget && (
        <GroupsModal
          defaultUserGroupOptions={defaultUserGroupOptions}
          groupsTarget={groupsTarget}
          onClose={() => setGroupsTarget(null)}
          onSubmit={handleGroupSubmit}
          t={t}
        />
      )}

      {isCreateApiKeyModalOpen && (
        <CreateApiKeyModal
          onClose={() => setIsCreateApiKeyModalOpen(false)}
          onSubmit={handleCreateApiKeySubmit}
          t={t}
        />
      )}

      {newlyCreatedKey && (
        <RawApiKeyModal
          onClose={() => setNewlyCreatedKey(null)}
          rawKey={newlyCreatedKey}
          t={t}
        />
      )}
    </div>
  );
}

type UserProfileModalProps = {
  defaultUsername?: string;
  email?: string;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
  title: string;
  t: TranslationFunction;
};

function UserProfileModal({ defaultUsername, email, onClose, onSubmit, title, t }: UserProfileModalProps) {
  const isCreate = !email;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#1a1a1a]">
        <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-white/10">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
          <button className="text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200" onClick={onClose} type="button">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form className="flex flex-1 flex-col" onSubmit={onSubmit}>
          <div className="flex-1 space-y-5 p-5">
            {isCreate ? (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('admin.user.index.email', 'Email')}</label>
                <input
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-white/10 dark:bg-[#121212] dark:text-white"
                  name="email"
                  placeholder={t('admin.user.index.emailPlaceholder', 'Enter email')}
                  required
                  type="email"
                />
              </div>
            ) : null}
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
              {isCreate
                ? t('admin.user.index.text.passwordSetupCreate', 'Password setup is handled through registration and reset flows. This form creates the account profile.')
                : t('admin.user.index.text.passwordSetupEdit', 'Password setup is managed by IAM registration and reset flows. No password update is sent from this profile dialog.')}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('admin.user.index.username', 'Username')}</label>
              <input
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-white/10 dark:bg-[#121212] dark:text-white"
                defaultValue={defaultUsername}
                name="username"
                placeholder={t('admin.user.index.usernamePlaceholder', 'Enter username')}
                type="text"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-[#121212]">
            <button className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-zinc-800" onClick={onClose} type="button">
              {t('common.actions.cancel', 'Cancel')}
            </button>
            <button className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700" type="submit">
              {isCreate ? t('common.actions.create', 'Create') : t('common.actions.save', 'Save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type ApiKeysModalProps = {
  apiKeys: ApiKeyItem[];
  apiKeysLoadError: string | null;
  onClose: () => void;
  onCreate: () => void;
  onDelete: (keyId: string) => void;
  target: UserListItem;
  t: TranslationFunction;
};

function ApiKeysModal({ apiKeys, apiKeysLoadError, onClose, onCreate, onDelete, target, t }: ApiKeysModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#1a1a1a]">
        <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-white/10">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <Key className="h-5 w-5 text-blue-500" />
            {t('admin.user.index.apiKeysForUser', 'API keys - {{email}}', { email: target.email })}
          </h3>
          <button className="text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200" onClick={onClose} type="button">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          {apiKeysLoadError ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
              {apiKeysLoadError}
            </div>
          ) : null}
          <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10" onClick={onCreate} type="button">
            <Plus className="h-4 w-4" />
            {t('admin.user.index.addApiKey', 'Add API key')}
          </button>
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/10">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-[#121212]">
                <tr>
                  <th className="px-4 py-3 font-medium">{t('admin.user.index.apiKeyName', 'Name')}</th>
                  <th className="px-4 py-3 font-medium">{t('admin.user.index.apiKeyValue', 'Key')}</th>
                  <th className="px-4 py-3 font-medium">{t('admin.user.index.apiKeyUsed', 'Used')}</th>
                  <th className="px-4 py-3 font-medium">{t('admin.user.index.apiKeyStatus', 'Status')}</th>
                  <th className="px-4 py-3 text-right font-medium">{t('admin.user.index.columns.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {apiKeys.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-slate-500" colSpan={5}>
                      {t('admin.user.index.noApiKeys', 'No API keys')}
                    </td>
                  </tr>
                ) : apiKeys.map((key) => (
                  <tr className="hover:bg-slate-50 dark:hover:bg-white/5" key={key.id}>
                    <td className="px-4 py-3 text-slate-900 dark:text-white">{key.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{key.key}</td>
                    <td className="px-4 py-3">{key.used}</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-600 dark:bg-emerald-500/10">{getApiKeyStatusLabel(key.status, t)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-xs font-medium text-slate-400 transition-colors hover:text-red-500" onClick={() => onDelete(key.id)} type="button">
                        {t('common.actions.delete', 'Delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

type GroupsModalProps = {
  defaultUserGroupOptions: ReadonlyArray<{ value: string; label: string }>;
  groupsTarget: UserListItem;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
  t: TranslationFunction;
};

function GroupsModal({ defaultUserGroupOptions, groupsTarget, onClose, onSubmit, t }: GroupsModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#1a1a1a]">
        <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-white/10">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <Users className="h-5 w-5 text-blue-500" />
            {t('admin.user.index.assignGroup', 'Assign group')}
          </h3>
          <button className="text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200" onClick={onClose} type="button">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form className="flex flex-col" onSubmit={onSubmit}>
          <div className="p-5">
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('admin.user.index.assignGroupForUser', 'Select group for {{email}}', { email: groupsTarget.email })}
            </label>
            <select
              className="w-full cursor-pointer appearance-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-white/10 dark:bg-[#121212] dark:text-white"
              defaultValue={groupsTarget.group}
              name="group"
            >
              {defaultUserGroupOptions.map((group) => (
                <option key={group.value} value={group.value}>{group.label}</option>
              ))}
              {!defaultUserGroupOptions.some((group) => group.value === groupsTarget.group) && (
                <option value={groupsTarget.group}>{t('admin.user.groups.current', '{{group}} (current)', { group: groupsTarget.group })}</option>
              )}
            </select>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-[#121212]">
            <button className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-zinc-800" onClick={onClose} type="button">
              {t('common.actions.cancel', 'Cancel')}
            </button>
            <button className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700" type="submit">
              {t('common.actions.save', 'Save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateApiKeyModal({ onClose, onSubmit, t }: { onClose: () => void; onSubmit: (event: React.FormEvent) => void; t: TranslationFunction }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#1a1a1a]">
        <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-white/10">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('admin.user.index.createApiKey', 'Create API key')}</h3>
          <button className="text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200" onClick={onClose} type="button">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form className="flex flex-col" onSubmit={onSubmit}>
          <div className="p-5">
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('admin.user.index.apiKeyName', 'Name')}</label>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition-all focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-[#121212] dark:text-white"
              name="keyName"
              placeholder={t('admin.user.index.apiKeyNamePlaceholder', 'Development environment')}
              type="text"
            />
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-[#121212]">
            <button className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-zinc-800" onClick={onClose} type="button">
              {t('common.actions.cancel', 'Cancel')}
            </button>
            <button className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700" type="submit">
              {t('admin.user.index.generateApiKey', 'Generate key')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RawApiKeyModal({ onClose, rawKey, t }: { onClose: () => void; rawKey: string; t: TranslationFunction }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#1a1a1a]">
        <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-white/10">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            {t('admin.user.index.apiKeyCreated', 'API key created')}
          </h3>
          <button className="text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200" onClick={onClose} type="button">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-6 p-6">
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
            <Shield className="h-5 w-5 shrink-0" />
            <div>{t('admin.user.index.copyApiKeyNotice', 'Copy this API key now. It cannot be shown again after this dialog closes.')}</div>
          </div>
          <div className="relative">
            <input className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-4 pr-32 font-mono text-sm text-slate-900 dark:border-white/10 dark:bg-[#121212] dark:text-white" readOnly type="text" value={rawKey} />
            <CopyButton
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5"
              copiedLabel={t('common.actions.copied', 'Copied')}
              label={t('common.actions.copy', 'Copy')}
              text={rawKey}
              title={t('common.actions.copy', 'Copy')}
              variant="inline"
            />
          </div>
        </div>
        <div className="flex justify-end border-t border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-[#121212]">
          <button className="w-full rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 sm:w-auto" onClick={onClose} type="button">
            {t('common.actions.done', 'Done')}
          </button>
        </div>
      </div>
    </div>
  );
}
