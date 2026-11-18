import type {
  DeployAppKindTabId,
  DeployOwnershipMessageKey,
} from "./application-catalog";
import type {
  DeployAppSourceIssueCode,
  DeployAppSourceReadinessReason,
} from "./deploy-app-source";

export interface ApplicationCatalogMessages {
  accessToken: {
    action: string;
    app: string;
    appId: string;
    close: string;
    copied: string;
    copy: string;
    description: string;
    error: string;
    expiresAt: string;
    forbidden: string;
    generate: string;
    group: string;
    hide: string;
    loading: string;
    reference: string;
    regenerate: string;
    reveal: string;
    scope: string;
    securityNote: string;
    sessionId: string;
    tenantApplicationId: string;
    title: string;
    tokenLabel: string;
    unavailable: string;
  };
  back: string;
  categories: {
    actions: {
      activate: string;
      applying: string;
      deactivate: string;
      delete: string;
      edit: string;
    };
    columns: {
      actions: string;
      category: string;
      parent: string;
      sortOrder: string;
      status: string;
      updatedAt: string;
    };
    cascade: {
      level1: string;
      level2: string;
      level3: string;
      level4: string;
      level5: string;
      empty: string;
      emptyColumn: string;
      selectHint: string;
      addRoot: string;
      addChild: string;
      depthHint: string;
      loading: string;
    };
    countTemplate: string;
    create: string;
    delete: {
      blockedChildren: string;
      cancel: string;
      confirm: string;
      deleting: string;
      description: string;
      error: string;
      title: string;
    };
    description: string;
    emptyDescription: string;
    emptyTitle: string;
    filterAll: string;
    forbidden: string;
    form: {
      cancel: string;
      close: string;
      code: string;
      codeHint: string;
      codeImmutable: string;
      codePlaceholder: string;
      createDescription: string;
      createTitle: string;
      description: string;
      descriptionPlaceholder: string;
      editDescription: string;
      editTitle: string;
      icon: string;
      iconHint: string;
      iconPlaceholder: string;
      level: string;
      localeDescriptionHint: string;
      localeEn: string;
      localeHint: string;
      localeZh: string;
      name: string;
      namePlaceholder: string;
      parent: string;
      parentHint: string;
      parentLockedHint: string;
      parentNone: string;
      save: string;
      saveError: string;
      saved: string;
      saving: string;
      sortOrder: string;
      sortOrderHint: string;
      status: string;
      statusHint: string;
      validation: {
        "code-duplicate": string;
        "code-invalid": string;
        "code-required": string;
        "description-too-long": string;
        "name-required": string;
        "name-too-long": string;
        "parent-cycle": string;
        "parent-level-invalid": string;
        "parent-missing": string;
        "sort-order-invalid": string;
      };
    };
    loadError: string;
    loadMore: string;
    loadingMore: string;
    navDescription: string;
    navLabel: string;
    refresh: string;
    retry: string;
    rootParent: string;
    searchPlaceholder: string;
    statuses: {
      active: string;
      deleted: string;
      inactive: string;
      unknown: string;
    };
    title: string;
    unavailable: string;
  };
  columns: {
    actions: string;
    application: string;
    domain: string;
    environment: string;
    platform: string;
    scope: string;
    status: string;
    type: string;
    updatedAt: string;
    version: string;
  };
  /** Deploy list filters: endpoint kind tabs, ownership, and their states. */
  deployFilters: {
    allOrganizations: string;
    clear: string;
    emptyDescription: string;
    emptyTitle: string;
    invalidQuery: string;
    kindLabel: string;
    kinds: Record<DeployAppKindTabId, string>;
    organizationHint: string;
    organizationIdTemplate: string;
    organizationInvalid: string;
    organizationLabel: string;
    organizationLoading: string;
    organizationPlaceholder: string;
    organizationUnavailable: string;
    ownershipLabel: string;
    ownerships: Record<DeployOwnershipMessageKey, string>;
  };
  countTemplate: string;
  emptyDescription: string;
  emptyTitle: string;
  groups: {
    appStore: { description: string; label: string };
    deploy: { description: string; label: string };
    iam: { description: string; label: string };
  };
  integrations: {
    actions: {
      miniProgram: string;
      officialAccount: string;
      payment: string;
    };
    channel: {
      accountType: string;
      appId: string;
      availableTitle: string;
      clear: string;
      currentTitle: string;
      disabled: string;
      emptyAvailable: string;
      emptyCurrent: string;
      enabled: string;
      provider: string;
      searchPlaceholder: string;
      select: string;
      selected: string;
      status: string;
      unauthorized: string;
    };
    drawer: {
      anchor: {
        description: string;
        linked: string;
        noDeployApps: string;
        placeholder: string;
        required: string;
        title: string;
      };
      application: string;
      close: string;
      deployAnchor: string;
      descriptions: {
        miniProgram: string;
        officialAccount: string;
        payment: string;
      };
      environment: {
        description: string;
        empty: string;
        label: string;
      };
      errors: string;
      forbidden: string;
      loadError: string;
      loading: string;
      noChanges: string;
      retry: string;
      save: string;
      saveError: string;
      saved: string;
      saving: string;
      titles: {
        miniProgram: string;
        officialAccount: string;
        payment: string;
      };
      unavailable: string;
      warnings: string;
    };
    payment: {
      accountName: string;
      accountNo: string;
      add: string;
      availableTitle: string;
      boundTitle: string;
      country: string;
      currency: string;
      defaultBadge: string;
      directMode: string;
      emptyAvailable: string;
      emptyBound: string;
      environment: string;
      incompatible: string;
      makeDefault: string;
      mode: string;
      noPayCapability: string;
      partnerMode: string;
      provider: string;
      remove: string;
      searchPlaceholder: string;
      status: string;
      summary: string;
    };
    paymentEnvironments: {
      development: string;
      production: string;
      sandbox: string;
    };
    paymentStatuses: {
      active: string;
      deprecated: string;
      inactive: string;
      suspended: string;
      unknown: string;
    };
    picker: {
      channelOpen: string;
      paymentOpen: string;
      changeChannel: string;
      title: { miniProgram: string; officialAccount: string; payment: string };
      description: { miniProgram: string; officialAccount: string; payment: string };
      scopes: { personal: string; organization: string; tenant: string };
      scopeDescriptions: { personal: string; organization: string; tenant: string };
      searchPlaceholder: string;
      empty: string;
      emptySearch: string;
      loading: string;
      error: string;
      retry: string;
      cancel: string;
      confirm: string;
      loadMore: string;
      scopeLabel: string;
      listLabel: string;
      close: string;
      selectedCount: string;
    };
    summary: {
      miniProgram: string;
      officialAccount: string;
      paymentCount: string;
    };
    validation: {
      "channel-app-id-missing": string;
      "channel-disabled": string;
      "channel-not-found": string;
      "channel-unauthorized": string;
      "payment-capability-missing": string;
      "payment-default-duplicate": string;
      "payment-default-missing": string;
      "payment-duplicate": string;
      "payment-environment-mismatch": string;
      "payment-inactive": string;
      "payment-not-found": string;
      "payment-partner-sub-merchant-missing": string;
      "wechat-app-id-mismatch": string;
      "wechat-channel-missing": string;
      "wechat-payment-missing": string;
    };
  };
  moderation: {
    title: string;
    description: string;
    loadError: string;
    forbidden: string;
    unavailable: string;
    retry: string;
    refresh: string;
    filters: { status: string; all: string };
    statuses: {
      APPROVED: string;
      CHANGES_REQUESTED: string;
      IN_REVIEW: string;
      PENDING: string;
      REJECTED: string;
      unknown: string;
    };
    submissionTypes: {
      METADATA: string;
      RELEASE: string;
      unknown: string;
    };
    columns: {
      listing: string;
      submissionType: string;
      status: string;
      assignee: string;
      submittedAt: string;
      actions: string;
    };
    emptyTitle: string;
    emptyDescription: string;
    loadMore: string;
    loading: string;
    reviewAction: string;
    detailAction: string;
    detail: {
      title: string;
      description: string;
      loading: string;
      error: string;
      attributes: string;
      emptyAttributes: string;
      close: string;
    };
    decision: {
      title: string;
      description: string;
      type: string;
      approve: string;
      reject: string;
      requestChanges: string;
      reasonCode: string;
      reasonCodePlaceholder: string;
      reasonDetail: string;
      reasonDetailPlaceholder: string;
      reasonRequired: string;
      submit: string;
      submitting: string;
      cancel: string;
      success: string;
      error: string;
      forbidden: string;
      assignToMe: string;
      assigned: string;
      assignError: string;
    };
  };
  appeals: {
    title: string;
    description: string;
    loadError: string;
    forbidden: string;
    unavailable: string;
    retry: string;
    refresh: string;
    filters: { status: string; all: string };
    statuses: { APPROVED: string; PENDING: string; REJECTED: string; UNKNOWN: string };
    columns: {
      appeal: string;
      review: string;
      reason: string;
      status: string;
      submittedAt: string;
      decidedAt: string;
      actions: string;
    };
    emptyTitle: string;
    emptyDescription: string;
    loading: string;
    loadMore: string;
    decideAction: string;
    dialog: {
      title: string;
      description: string;
      decision: string;
      approve: string;
      reject: string;
      note: string;
      notePlaceholder: string;
      noteRequired: string;
      submit: string;
      submitting: string;
      cancel: string;
      success: string;
      error: string;
      forbidden: string;
    };
  };
  publishers: {
    title: string;
    description: string;
    loadError: string;
    forbidden: string;
    unavailable: string;
    retry: string;
    refresh: string;
    statuses: { ACTIVE: string; DRAFT: string; INACTIVE: string; SUSPENDED: string; UNKNOWN: string };
    verificationStatuses: {
      APPROVED: string;
      NOT_SUBMITTED: string;
      PENDING: string;
      REJECTED: string;
      UNKNOWN: string;
      VERIFIED: string;
    };
    columns: {
      publisher: string;
      type: string;
      status: string;
      verification: string;
      contact: string;
      createdAt: string;
      actions: string;
    };
    emptyTitle: string;
    emptyDescription: string;
    loading: string;
    loadMore: string;
    verifyAction: string;
    dialog: {
      title: string;
      description: string;
      verificationType: string;
      decision: string;
      approve: string;
      reject: string;
      requestMoreInfo: string;
      submit: string;
      submitting: string;
      cancel: string;
      success: string;
      error: string;
      forbidden: string;
      verificationTypes: {
        BUSINESS: string;
        IDENTITY: string;
        PAYOUT: string;
        TAX: string;
      };
    };
  };
  featured: {
    title: string;
    description: string;
    loadError: string;
    forbidden: string;
    unavailable: string;
    retry: string;
    refresh: string;
    columns: {
      slot: string;
      listing: string;
      status: string;
      window: string;
      audience: string;
      platform: string;
      actions: string;
    };
    emptyTitle: string;
    emptyDescription: string;
    loading: string;
    editAction: string;
    createAction: string;
    dialog: {
      title: string;
      createTitle: string;
      createDescription: string;
      slotCode: string;
      slotCodePlaceholder: string;
      description: string;
      listingId: string;
      listingIdPlaceholder: string;
      startsAt: string;
      endsAt: string;
      slotStatus: string;
      statuses: { ACTIVE: string; ENDED: string; SCHEDULED: string };
      submit: string;
      submitting: string;
      cancel: string;
      success: string;
      error: string;
      forbidden: string;
      invalidWindow: string;
      invalidSlot: string;
      invalidListing: string;
    };
  };
  collections: {
    title: string;
    description: string;
    loadError: string;
    forbidden: string;
    unavailable: string;
    retry: string;
    refresh: string;
    createAction: string;
    columns: {
      collection: string;
      type: string;
      audience: string;
      status: string;
      items: string;
      sortOrder: string;
      actions: string;
    };
    emptyTitle: string;
    emptyDescription: string;
    loading: string;
    loadMore: string;
    editAction: string;
    itemsAction: string;
    statuses: { ACTIVE: string; ARCHIVED: string; DRAFT: string; unknown: string };
    types: {
      CATEGORY: string;
      CHART: string;
      EDITORIAL: string;
      PERSONALIZED: string;
      SEASONAL: string;
      unknown: string;
    };
    audiences: { INTERNAL: string; PUBLIC: string; TENANT: string; unknown: string };
    create: {
      title: string;
      description: string;
      code: string;
      codePlaceholder: string;
      type: string;
      audience: string;
      submit: string;
      submitting: string;
      cancel: string;
      success: string;
      error: string;
      invalidCode: string;
    };
    edit: {
      title: string;
      description: string;
      status: string;
      sortOrder: string;
      submit: string;
      submitting: string;
      cancel: string;
      success: string;
      error: string;
    };
    items: {
      title: string;
      description: string;
      listingIds: string;
      listingIdsPlaceholder: string;
      listingIdsHint: string;
      submit: string;
      submitting: string;
      cancel: string;
      success: string;
      error: string;
    };
  };
  listings: {
    title: string;
    description: string;
    loadError: string;
    forbidden: string;
    unavailable: string;
    retry: string;
    refresh: string;
    columns: {
      listing: string;
      publisher: string;
      status: string;
      visibility: string;
      category: string;
      platform: string;
      version: string;
      updatedAt: string;
      actions: string;
    };
    emptyTitle: string;
    emptyDescription: string;
    loading: string;
    loadMore: string;
    visibilityAction: string;
    detailAction: string;
    detail: {
      title: string;
      description: string;
      loading: string;
      error: string;
      attributes: string;
      emptyAttributes: string;
      close: string;
    };
    statuses: {
      ACTIVE: string;
      ARCHIVED: string;
      DRAFT: string;
      PUBLISHED: string;
      SUSPENDED: string;
      UNKNOWN: string;
    };
    visibility: {
      VISIBLE: string;
      HIDDEN: string;
      DELISTED: string;
      REGION_RESTRICTED: string;
      unknown: string;
    };
    dialog: {
      title: string;
      description: string;
      state: string;
      reason: string;
      reasonPlaceholder: string;
      submit: string;
      submitting: string;
      cancel: string;
      success: string;
      error: string;
      forbidden: string;
    };
  };
  analytics: {
    title: string;
    description: string;
    refresh: string;
    loading: string;
    loadError: string;
    inaccessible: string;
    kpi: {
      pendingTemplates: string;
      pendingModeration: string;
      publishers: string;
      listings: string;
      collections: string;
      templateCategories: string;
    };
    structureTitle: string;
    quickTitle: string;
    failureSource: {
      templates: string;
      moderation: string;
      publishers: string;
      listings: string;
      collections: string;
      templateCategories: string;
    };
  };
  loadError: string;
  organizationAppStoreNotice: string;
  refresh: string;
  retry: string;
  scopes: { organization: string; tenant: string };
  searchPlaceholder: string;
  sourceRemix: {
    action: string;
    title: string;
    description: string;
    application: string;
    close: string;
    loading: string;
    retry: string;
    readiness: {
      title: string;
      ready: string;
      missing: string;
      reasonLabel: string;
      reasons: Record<DeployAppSourceReadinessReason, string>;
    };
    kind: {
      label: string;
      git: string;
      archive: string;
      hint: string;
    };
    git: {
      provider: string;
      providerHint: string;
      repoUrl: string;
      repoUrlPlaceholder: string;
      repoRef: string;
      repoRefPlaceholder: string;
      subPath: string;
      subPathPlaceholder: string;
      credentialSecretRef: string;
      credentialSecretRefPlaceholder: string;
      cloneMode: string;
      cloneModeFull: string;
      cloneModeShallow: string;
      repoStatusTemplate: string;
    };
    archive: {
      current: string;
      currentEmpty: string;
      artifactId: string;
      artifactIdPlaceholder: string;
      picker: string;
      pickerPlaceholder: string;
      pickerEmpty: string;
      uploadHint: string;
    };
    remix: {
      title: string;
      description: string;
      label: string;
      enabled: string;
      disabled: string;
      /** Explains why the switch is off; `{reason}` is the readiness sentence. */
      blockedTemplate: string;
      /** Explains a refused enable; `{reason}` is the readiness sentence. */
      conflictTemplate: string;
    };
    save: string;
    saving: string;
    saved: string;
    delete: {
      action: string;
      title: string;
      description: string;
      confirm: string;
      cancel: string;
      deleting: string;
    };
    errors: {
      unauthorized: string;
      forbidden: string;
      notFound: string;
      conflict: string;
      conflictTemplate: string;
      validation: string;
      unavailable: string;
      network: string;
      unknown: string;
      writeDenied: string;
    };
    validation: Record<DeployAppSourceIssueCode, string>;
  };
  statuses: {
    active: string;
    archived: string;
    disabled: string;
    draft: string;
    enabled: string;
    installed: string;
    paused: string;
    pending_config: string;
    terminated: string;
    unknown: string;
  };
  subtitleOrganizationTemplate: string;
  subtitleTenantTemplate: string;
  title: string;
  unavailable: string;
  overview: {
    title: string;
    description: string;
    loadError: string;
    unavailable: string;
    kpi: {
      applications: string;
      templates: string;
      categories: string;
      storeCategories: string;
    };
    kpiHint: {
      applications: string;
      templates: string;
      categories: string;
      storeCategories: string;
    };
    quickTitle: string;
    quickDescription: string;
    quick: {
      applications: string;
      moderation: string;
      storeCategories: string;
      templates: string;
      templateCategories: string;
    };
    recentTitle: string;
    recentEmpty: string;
    recentError: string;
    pendingTitle: string;
    pendingEmpty: string;
    pending: { templates: string; moderation: string };
    viewAll: string;
  };
  templates: {
    title: string;
    description: string;
    create: string;
    searchPlaceholder: string;
    statusFilter: string;
    statusAll: string;
    countTemplate: string;
    emptyTitle: string;
    emptyDescription: string;
    loadError: string;
    forbidden: string;
    unavailable: string;
    featuredBadge: string;
    statuses: Record<"DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED" | "DISABLED", string>;
    visibility: Record<"PUBLIC" | "PRIVATE", string>;
    pricing: Record<"FREE" | "PAID", string>;
    columns: {
      template: string;
      status: string;
      visibility: string;
      pricing: string;
      installs: string;
      updatedAt: string;
      actions: string;
    };
    actions: {
      edit: string;
      versions: string;
      submit: string;
      submitting: string;
      submitted: string;
      submitTitle: string;
      submitDescription: string;
      submitError: string;
      delete: string;
      deleting: string;
      deleteTitle: string;
      deleteDescription: string;
      deleteError: string;
    };
    form: {
      createTitle: string;
      createDescription: string;
      editTitle: string;
      editDescription: string;
      app: string;
      appPlaceholder: string;
      appHint: string;
      category: string;
      categoryPlaceholder: string;
      categoryHint: string;
      templateKey: string;
      templateKeyPlaceholder: string;
      templateKeyHint: string;
      displayName: string;
      displayNamePlaceholder: string;
      summary: string;
      summaryPlaceholder: string;
      description: string;
      descriptionPlaceholder: string;
      visibility: string;
      pricingModel: string;
      priceMinor: string;
      priceMinorPlaceholder: string;
      currency: string;
      currencyPlaceholder: string;
      iconMediaRef: string;
      iconMediaRefPlaceholder: string;
      coverMediaRef: string;
      coverMediaRefPlaceholder: string;
      screenshots: string;
      screenshotsPlaceholder: string;
      screenshotsHint: string;
      save: string;
      saving: string;
      cancel: string;
      saved: string;
      saveError: string;
      forbidden: string;
      unavailable: string;
      validation: Record<
        | "app-required"
        | "category-required"
        | "template-key-required"
        | "template-key-invalid"
        | "display-name-required"
        | "display-name-too-long"
        | "summary-required"
        | "summary-too-long"
        | "description-too-long"
        | "price-required"
        | "price-invalid"
        | "currency-required"
        | "currency-invalid",
        string
      >;
    };
    review: {
      action: string;
      title: string;
      description: string;
      status: string;
      note: string;
      notePlaceholder: string;
      featured: string;
      submit: string;
      submitting: string;
      cancel: string;
      success: string;
      error: string;
      forbidden: string;
      unavailable: string;
    };
    reviewQueue: {
      title: string;
      description: string;
    };
    versions: {
      title: string;
      description: string;
      loading: string;
      empty: string;
      loadError: string;
      createTitle: string;
      version: string;
      versionPlaceholder: string;
      changelog: string;
      changelogPlaceholder: string;
      create: string;
      creating: string;
      created: string;
      createError: string;
      close: string;
      columns: { version: string; status: string; changelog: string; createdAt: string };
      validation: {
        "version-required": string;
        "version-invalid": string;
        "changelog-too-long": string;
      };
    };
  };
  templateCategories: {
    title: string;
    description: string;
    countTemplate: string;
    emptyTitle: string;
    emptyDescription: string;
    loadError: string;
    forbidden: string;
    unavailable: string;
    readonlyNotice: string;
    rootParent: string;
    create: string;
    editAction: string;
    deleteAction: string;
    statuses: Record<"ACTIVE" | "DISABLED" | "UNKNOWN", string>;
    columns: {
      category: string;
      key: string;
      parent: string;
      status: string;
      sortOrder: string;
      actions: string;
    };
    form: {
      createTitle: string;
      createDescription: string;
      editTitle: string;
      editDescription: string;
      key: string;
      keyPlaceholder: string;
      keyHint: string;
      displayName: string;
      displayNamePlaceholder: string;
      description: string;
      descriptionPlaceholder: string;
      parent: string;
      parentPlaceholder: string;
      parentHint: string;
      sortOrder: string;
      status: string;
      save: string;
      saving: string;
      cancel: string;
      saved: string;
      saveError: string;
      forbidden: string;
      unavailable: string;
      validation: {
        "key-required": string;
        "key-invalid": string;
        "display-name-required": string;
      };
    };
    delete: {
      title: string;
      description: string;
      confirm: string;
      cancel: string;
      deleting: string;
      error: string;
      forbidden: string;
      blockedChildren: string;
    };
  };
}
