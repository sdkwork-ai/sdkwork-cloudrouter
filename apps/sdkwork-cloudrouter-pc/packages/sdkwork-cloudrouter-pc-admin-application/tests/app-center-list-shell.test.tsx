/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SdkworkI18nProvider } from "@sdkwork/i18n-pc-react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AppCenterCountLabel,
  AppCenterCursorFooter,
  AppCenterListHeader,
  AppCenterLoadFailure,
  AppCenterSummaryFooter,
  cursorCountText,
} from "../src/components/AppCenterListShell";
import { zh as zhMessages } from "../src/i18n/zh-CN/iam/application/catalog";

/**
 * App Center list chrome: every list renders one header row, one footer bar, and
 * one failure notice from this module, so the contract is tested once here
 * instead of being re-implemented (and re-broken) per panel.
 */

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderWithI18n(node: React.ReactNode) {
  return render(
    <SdkworkI18nProvider locale="zh-CN">{node}</SdkworkI18nProvider>,
  );
}

describe("app center list header", () => {
  it("renders one row with the title, the search/filter toolbar, and the actions", () => {
    renderWithI18n(
      <AppCenterListHeader
        actions={<button type="button">刷新</button>}
        description="组描述"
        title="应用列表"
        toolbar={<input aria-label="搜索" />}
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "应用列表" })).toBeTruthy();
    expect(screen.getByText("组描述")).toBeTruthy();
    const toolbar = document.querySelector("[data-app-center-toolbar]");
    expect(toolbar).not.toBeNull();
    expect(toolbar?.contains(screen.getByLabelText("搜索"))).toBe(true);
    expect(toolbar?.contains(screen.getByRole("button", { name: "刷新" }))).toBe(true);
  });

  it("omits the control cluster when the list has neither filters nor actions", () => {
    renderWithI18n(<AppCenterListHeader title="只有标题" />);
    expect(document.querySelector("[data-app-center-toolbar]")).toBeNull();
  });
});

describe("app center list footers", () => {
  it("prints the count and offers load-more only while the backend has more", () => {
    const onLoadMore = vi.fn();
    const { rerender } = renderWithI18n(
      <AppCenterCursorFooter
        countText="已加载 50 条"
        hasMore
        loadMoreLabel="加载更多"
        loading={false}
        loadingLabel="正在加载…"
        onLoadMore={onLoadMore}
      />,
    );

    expect(screen.getByText("已加载 50 条")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "加载更多" }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    rerender(
      <SdkworkI18nProvider locale="zh-CN">
        <AppCenterCursorFooter
          countText="已加载 50 条"
          hasMore={false}
          loadMoreLabel="加载更多"
          loading={false}
          loadingLabel="正在加载…"
          onLoadMore={onLoadMore}
        />
      </SdkworkI18nProvider>,
    );
    expect(screen.queryByRole("button", { name: "加载更多" })).toBeNull();
  });

  it("disables load-more while a page is in flight", () => {
    renderWithI18n(
      <AppCenterCursorFooter
        countText="已加载 50 条"
        hasMore
        loadMoreLabel="加载更多"
        loading
        loadingLabel="正在加载…"
        onLoadMore={() => undefined}
      />,
    );
    const button = screen.getByRole("button", { name: "正在加载…" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it("renders the count in a single-row summary bar for complete lists", () => {
    renderWithI18n(<AppCenterSummaryFooter countText="共 4 个精选位" />);
    expect(screen.getByText("共 4 个精选位")).toBeTruthy();
    expect(document.querySelector("[data-app-center-summary-footer]")).not.toBeNull();
  });

  it("keeps the count label in one styled span", () => {
    renderWithI18n(<AppCenterCountLabel text="共 14 个应用" />);
    expect(document.querySelector("[data-app-center-count]")?.textContent).toBe("共 14 个应用");
  });
});

describe("app center failure notice", () => {
  it("explains the failure and offers the retry command", () => {
    const onRetry = vi.fn();
    renderWithI18n(
      <AppCenterLoadFailure message="加载失败" onRetry={onRetry} retryLabel="重试" />,
    );

    expect(screen.getByText("加载失败")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "重试" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe("cursor footer copy", () => {
  it("reports loaded rows and, when known, the server total", () => {
    expect(cursorCountText(zhMessages, 50)).toBe("已加载 50 条");
    expect(cursorCountText(zhMessages, 50, 120)).toBe("已加载 50 / 共 120 条");
  });
});
