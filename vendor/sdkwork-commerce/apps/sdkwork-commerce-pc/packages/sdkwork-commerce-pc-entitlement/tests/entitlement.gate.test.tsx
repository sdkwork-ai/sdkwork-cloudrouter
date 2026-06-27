import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  SdkworkEntitlementGate,
  SdkworkEntitlementIntlProvider,
} from "../src";

describe("sdkwork-commerce-pc-entitlement gate", () => {
  it("renders protected children when access is ready", () => {
    const Gate = SdkworkEntitlementGate;
    expect(Gate).toBeTypeOf("function");

    render(
      <Gate
        decision={{
          category: "assistant",
          id: "smart-chat",
          isAvailable: true,
          isNearLimit: false,
          recommendedAction: null,
          reasonCodes: [],
          remainingQuota: null,
          status: "ready",
          tags: ["Core"],
          title: "Smart Chat",
          usageRatio: null,
        }}
      >
        <div>Protected Surface</div>
      </Gate>,
    );

    expect(screen.getByText("Protected Surface")).toBeInTheDocument();
  });

  it("renders a sdkwork-style fallback for near-limit or blocked capability decisions and routes CTA clicks", () => {
    const Gate = SdkworkEntitlementGate;
    const onNavigate = vi.fn();

    expect(Gate).toBeTypeOf("function");

    render(
      <Gate
        decision={{
          category: "generation",
          description: "High-volume rendering is almost exhausted.",
          id: "batch-render",
          isAvailable: true,
          isNearLimit: true,
          reasonCodes: ["quota-near-limit"],
          recommendedAction: {
            capability: "offer",
            intent: "upgrade",
            label: "Review upgrade options",
            route: "/offers?group=membership",
          },
          remainingQuota: 8,
          status: "limited",
          tags: ["Render"],
          title: "Batch Render",
          usageRatio: 0.92,
        }}
        onNavigate={onNavigate}
      >
        <div>Protected Surface</div>
      </Gate>,
    );

    expect(screen.queryByText("Protected Surface")).not.toBeInTheDocument();
    expect(screen.getByText("Batch Render")).toBeInTheDocument();
    expect(screen.getByText(/remaining quota/i)).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /review upgrade options/i,
      }),
    );

    expect(onNavigate).toHaveBeenCalledWith("/offers?group=membership");
  });

  it("localizes limited gate copy through the shared entitlement intl seam", () => {
    const Gate = SdkworkEntitlementGate;
    const Provider = SdkworkEntitlementIntlProvider;

    render(
      <Provider locale="zh-CN">
        <Gate
          decision={{
            category: "generation",
            description: "",
            id: "batch-render",
            isAvailable: true,
            isNearLimit: true,
            reasonCodes: ["quota-near-limit"],
            recommendedAction: {
              capability: "offer",
              intent: "upgrade",
              label: "查看升级方案",
              route: "/offers?group=membership",
            },
            remainingQuota: 8,
            status: "limited",
            tags: ["Render"],
            title: "批量渲染",
            usageRatio: 0.92,
          }}
        >
          <div>Protected Surface</div>
        </Gate>
      </Provider>,
    );

    expect(screen.getByText("批量渲染")).toBeInTheDocument();
    expect(screen.getByText("仅剩 8 次额度，耗尽后需要执行商业化操作。")).toBeInTheDocument();
  });
});
