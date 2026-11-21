/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppCenterDecisionGroup } from "../src/components/AppCenterDecisionGroup";

/**
 * The shared decision control is used by publisher verification, moderation,
 * appeal adjudication, listing visibility, and the source-kind switch. It has to
 * expose a radio group (not three independent toggles) so assistive technology
 * hears "one of these", not "any of these".
 */

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const OPTIONS = [
  { label: "通过", tone: "positive", value: "APPROVE" },
  { label: "驳回", tone: "negative", value: "REJECT" },
  { label: "补充材料", tone: "neutral", value: "REQUEST_MORE_INFO" },
] as const;

describe("app center decision group", () => {
  it("renders one labelled radio group with the current value checked", () => {
    render(
      <AppCenterDecisionGroup
        label="裁决结果"
        onChange={() => undefined}
        options={OPTIONS}
        value="REJECT"
      />,
    );

    const group = screen.getByRole("radiogroup", { name: "裁决结果" });
    expect(group).toBeTruthy();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("radio", { name: "驳回" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: "通过" }).getAttribute("aria-checked")).toBe("false");
  });

  it("reports the chosen value and keeps every option focusable", () => {
    const onChange = vi.fn();
    render(
      <AppCenterDecisionGroup label="可见性" onChange={onChange} options={OPTIONS} value="APPROVE" />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "补充材料" }));
    expect(onChange).toHaveBeenCalledWith("REQUEST_MORE_INFO");

    for (const radio of screen.getAllByRole("radio")) {
      expect(radio.getAttribute("tabindex") === "-1").toBe(false);
    }
  });
});
