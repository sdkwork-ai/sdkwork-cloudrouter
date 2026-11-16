import type {
  DeployAppTemplate,
  DeployAppTemplateCreateInput,
  DeployAppTemplateDraft,
  DeployAppTemplateIssue,
  DeployAppTemplateScreenshot,
  DeployAppTemplateUpdateInput,
} from "../types/deploy-app-templates";

/** Template keys follow the same lower-kebab shape as application keys. */
export const DEPLOY_TEMPLATE_KEY_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/u;
/** SemVer is what the template version contract documents. */
export const DEPLOY_TEMPLATE_VERSION_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u;

const DISPLAY_NAME_MAX = 120;
const SUMMARY_MAX = 280;
const DESCRIPTION_MAX = 4000;
const CHANGELOG_MAX = 2000;

export function createEmptyTemplateDraft(categoryUuid = ""): DeployAppTemplateDraft {
  return {
    appUuid: "",
    categoryUuid,
    templateKey: "",
    displayName: "",
    summary: "",
    description: "",
    visibility: "PUBLIC",
    pricingModel: "FREE",
    priceMinor: "",
    currency: "",
    iconMediaRef: "",
    coverMediaRef: "",
    screenshotsText: "",
  };
}

export function createTemplateDraft(template: DeployAppTemplate): DeployAppTemplateDraft {
  return {
    appUuid: template.appUuid,
    categoryUuid: template.categoryUuid,
    templateKey: template.templateKey,
    displayName: template.displayName,
    summary: template.summary,
    description: template.description,
    visibility: template.visibility,
    pricingModel: template.pricingModel,
    priceMinor: template.priceMinor,
    currency: template.currency,
    iconMediaRef: template.iconMediaRef ?? "",
    coverMediaRef: template.coverMediaRef ?? "",
    screenshotsText: template.screenshots
      .map((screenshot) => [screenshot.mediaRef, screenshot.device, screenshot.caption].filter(Boolean).join(" | "))
      .join("\n"),
  };
}

/**
 * Validates the editable listing copy.
 *
 * `editing` keeps the identity fields (source app, template key) out of the
 * check because the update command cannot change them. Everything else mirrors
 * the platform write contract so the operator sees the problem before the API
 * rejects it.
 */
export function validateTemplateDraft(
  draft: DeployAppTemplateDraft,
  editing: boolean,
): DeployAppTemplateIssue[] {
  const issues: DeployAppTemplateIssue[] = [];
  if (!editing) {
    if (!draft.appUuid.trim()) {
      issues.push({ field: "appUuid", code: "app-required" });
    }
    if (!draft.categoryUuid.trim()) {
      issues.push({ field: "categoryUuid", code: "category-required" });
    }
    const templateKey = draft.templateKey.trim();
    if (!templateKey) {
      issues.push({ field: "templateKey", code: "template-key-required" });
    } else if (!DEPLOY_TEMPLATE_KEY_PATTERN.test(templateKey)) {
      issues.push({ field: "templateKey", code: "template-key-invalid" });
    }
  } else if (!draft.categoryUuid.trim()) {
    issues.push({ field: "categoryUuid", code: "category-required" });
  }

  const displayName = draft.displayName.trim();
  if (!displayName) {
    issues.push({ field: "displayName", code: "display-name-required" });
  } else if (displayName.length > DISPLAY_NAME_MAX) {
    issues.push({ field: "displayName", code: "display-name-too-long" });
  }

  const summary = draft.summary.trim();
  if (!summary) {
    issues.push({ field: "summary", code: "summary-required" });
  } else if (summary.length > SUMMARY_MAX) {
    issues.push({ field: "summary", code: "summary-too-long" });
  }

  if (draft.description.length > DESCRIPTION_MAX) {
    issues.push({ field: "description", code: "description-too-long" });
  }

  if (draft.pricingModel === "PAID") {
    const price = draft.priceMinor.trim();
    if (!price) {
      issues.push({ field: "priceMinor", code: "price-required" });
    } else if (!/^\d+$/u.test(price) || Number(price) <= 0) {
      issues.push({ field: "priceMinor", code: "price-invalid" });
    }
    const currency = draft.currency.trim().toUpperCase();
    if (!currency) {
      issues.push({ field: "currency", code: "currency-required" });
    } else if (!/^[A-Z]{3}$/u.test(currency)) {
      issues.push({ field: "currency", code: "currency-invalid" });
    }
  }

  return issues;
}

export function toTemplateCreateInput(draft: DeployAppTemplateDraft): DeployAppTemplateCreateInput {
  const paid = draft.pricingModel === "PAID";
  const screenshots = parseScreenshots(draft.screenshotsText);
  return {
    appUuid: draft.appUuid.trim(),
    categoryUuid: draft.categoryUuid.trim(),
    templateKey: draft.templateKey.trim(),
    displayName: draft.displayName.trim(),
    summary: draft.summary.trim(),
    ...(draft.description.trim() ? { description: draft.description.trim() } : {}),
    visibility: draft.visibility,
    pricingModel: draft.pricingModel,
    ...(paid && draft.priceMinor.trim() ? { priceMinor: draft.priceMinor.trim() } : {}),
    ...(paid && draft.currency.trim() ? { currency: draft.currency.trim().toUpperCase() } : {}),
    ...(draft.iconMediaRef.trim() ? { iconMediaRef: draft.iconMediaRef.trim() } : {}),
    ...(draft.coverMediaRef.trim() ? { coverMediaRef: draft.coverMediaRef.trim() } : {}),
    ...(screenshots.length > 0 ? { screenshots } : {}),
  };
}

export function toTemplateUpdateInput(draft: DeployAppTemplateDraft): DeployAppTemplateUpdateInput {
  const paid = draft.pricingModel === "PAID";
  const screenshots = parseScreenshots(draft.screenshotsText);
  return {
    displayName: draft.displayName.trim(),
    summary: draft.summary.trim(),
    description: draft.description.trim(),
    categoryUuid: draft.categoryUuid.trim(),
    visibility: draft.visibility,
    pricingModel: draft.pricingModel,
    ...(paid ? { priceMinor: draft.priceMinor.trim(), currency: draft.currency.trim().toUpperCase() } : {}),
    iconMediaRef: draft.iconMediaRef.trim(),
    coverMediaRef: draft.coverMediaRef.trim(),
    screenshots,
  };
}

/** Parse `mediaRef | device? | caption?` lines; blank lines are ignored. */
export function parseScreenshots(text: string | undefined): DeployAppTemplateScreenshot[] {
  return (text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line, index) => {
      const [mediaRef = "", device = "", ...captionParts] = line.split("|").map((part) => part.trim());
      const caption = captionParts.join(" | ").trim();
      return {
        mediaRef,
        ...(device ? { device } : {}),
        ...(caption ? { caption } : {}),
        sortOrder: index,
      };
    })
    .filter((screenshot) => screenshot.mediaRef.length > 0);
}

export function validateVersionInput(input: { version: string; changelog?: string }): DeployAppTemplateIssue[] {
  const issues: DeployAppTemplateIssue[] = [];
  const version = input.version.trim();
  if (!version) {
    issues.push({ field: "version", code: "version-required" });
  } else if (!DEPLOY_TEMPLATE_VERSION_PATTERN.test(version)) {
    issues.push({ field: "version", code: "version-invalid" });
  }
  if ((input.changelog ?? "").length > CHANGELOG_MAX) {
    issues.push({ field: "changelog", code: "changelog-too-long" });
  }
  return issues;
}
