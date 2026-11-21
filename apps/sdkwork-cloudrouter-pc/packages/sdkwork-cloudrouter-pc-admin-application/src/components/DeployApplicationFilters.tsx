import { Button, Input, Tabs, TabsList, TabsTrigger } from "@sdkwork/ui-pc-react";

import type { ApplicationCatalogMessages } from "../i18n";
import {
  DEPLOY_APP_KIND_TABS,
  DEPLOY_OWNERSHIP_FILTERS,
} from "../services/deploy-application-filter";
import type {
  DeployAppKindTabId,
  DeployAppListFilter,
  DeployOrganizationOption,
  DeployOwnershipFilterId,
} from "../types/application-catalog";

/** Organization lookup state behind the ownership filter's organization field. */
export interface DeployOrganizationLookup {
  status: "idle" | "loading" | "ready" | "failed";
  options: readonly DeployOrganizationOption[];
}

const selectClassName = [
  "h-9 min-w-32 rounded-[var(--sdk-radius-control)] border border-[var(--sdk-color-border-default)]",
  "bg-[var(--sdk-color-surface-panel)] px-3 text-sm text-[var(--sdk-color-text-primary)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sdk-color-border-focus)]",
].join(" ");

const fieldLabelClassName = "text-xs font-medium text-[var(--sdk-color-text-muted)]";

/**
 * Deploy endpoint-kind tabs.
 *
 * The tabs stay on their own full-width row because every kind is a peer choice;
 * the ownership filter that narrows within a tab lives in the list header next
 * to the search box (`DeployApplicationHeaderFilters`).
 */
export function DeployApplicationFilters({
  filter,
  messages,
  onKindTabChange,
}: {
  filter: DeployAppListFilter;
  messages: ApplicationCatalogMessages;
  onKindTabChange: (tab: DeployAppKindTabId) => void;
}) {
  const copy = messages.deployFilters;
  return (
    <Tabs onValueChange={(value) => onKindTabChange(value as DeployAppKindTabId)} value={filter.kindTab}>
      <TabsList
        aria-label={copy.kindLabel}
        className="h-auto w-full flex-wrap justify-start"
        data-deploy-kind-tabs
      >
        {DEPLOY_APP_KIND_TABS.map((tab) => (
          <TabsTrigger
            className="min-w-0 px-3"
            data-deploy-kind-tab={tab.id}
            key={tab.id}
            value={tab.id}
          >
            {copy.kinds[tab.id]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

/**
 * Deploy list header controls: the ownership filter and its reset.
 *
 * The component is controlled: it never fetches or re-fetches by itself, so a
 * filter change is one URL update and the page turns that into one server
 * query. Every control is inline so the whole filter set shares the search
 * box's row; the organization field degrades from a directory select to a
 * validated numeric input when the directory is unavailable.
 */
export function DeployApplicationHeaderFilters({
  filter,
  filtersActive,
  lookup,
  messages,
  onClear,
  onOrganizationCommit,
  onOrganizationDraftChange,
  onOrganizationSelect,
  onOwnershipChange,
  organizationDraft,
  organizationError,
  showOwnership,
}: {
  filter: DeployAppListFilter;
  filtersActive: boolean;
  lookup: DeployOrganizationLookup;
  messages: ApplicationCatalogMessages;
  onClear: () => void;
  onOrganizationCommit: () => void;
  onOrganizationDraftChange: (value: string) => void;
  onOrganizationSelect: (value: string) => void;
  onOwnershipChange: (ownership: DeployOwnershipFilterId) => void;
  organizationDraft: string;
  organizationError: boolean;
  /** Owned by the page: an organization drill-down already fixes the scope. */
  showOwnership: boolean;
}) {
  const copy = messages.deployFilters;
  const organizationOptions = lookup.options;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2" data-deploy-header-filters>
      {showOwnership ? (
        <div className="flex flex-wrap items-center gap-2" data-deploy-ownership-filters>
          <span className={fieldLabelClassName}>{copy.ownershipLabel}</span>
          <select
            aria-label={copy.ownershipLabel}
            className={selectClassName}
            data-deploy-ownership-filter
            onChange={(event) => onOwnershipChange(event.target.value as DeployOwnershipFilterId)}
            value={filter.ownership}
          >
            {DEPLOY_OWNERSHIP_FILTERS.map((definition) => (
              <option key={definition.id} value={definition.id}>
                {copy.ownerships[definition.messageKey]}
              </option>
            ))}
          </select>

          {filter.ownership === "ORGANIZATION" ? (
            organizationOptions.length > 0 ? (
              <select
                aria-label={copy.organizationLabel}
                className={selectClassName}
                data-deploy-organization-select
                onChange={(event) => onOrganizationSelect(event.target.value)}
                value={filter.organizationId ?? ""}
              >
                <option value="">{copy.allOrganizations}</option>
                {filter.organizationId
                  && !organizationOptions.some((option) => option.id === filter.organizationId) ? (
                    <option value={filter.organizationId}>#{filter.organizationId}</option>
                  ) : null}
                {organizationOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name ? `${option.name} (#${option.id})` : `#${option.id}`}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                aria-describedby={organizationError ? "deploy-organization-error" : undefined}
                aria-invalid={organizationError}
                aria-label={copy.organizationLabel}
                className="w-40"
                data-deploy-organization-input
                inputMode="numeric"
                onBlur={onOrganizationCommit}
                onChange={(event) => onOrganizationDraftChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onOrganizationCommit();
                  }
                }}
                placeholder={copy.organizationPlaceholder}
                value={organizationDraft}
              />
            )
          ) : null}

          {filter.ownership === "ORGANIZATION" && organizationOptions.length === 0 ? (
            organizationError ? (
              <p
                className="text-xs text-[var(--sdk-color-state-danger)]"
                data-deploy-organization-error
                id="deploy-organization-error"
                role="alert"
              >
                {copy.organizationInvalid}
              </p>
            ) : (
              <p className="text-xs text-[var(--sdk-color-text-muted)]">
                {lookup.status === "loading"
                  ? copy.organizationLoading
                  : lookup.status === "failed"
                    ? copy.organizationUnavailable
                    : copy.organizationHint}
              </p>
            )
          ) : null}
        </div>
      ) : null}

      {filtersActive ? (
        <Button data-deploy-filter-clear onClick={onClear} size="sm" type="button" variant="ghost">
          {copy.clear}
        </Button>
      ) : null}
    </div>
  );
}
