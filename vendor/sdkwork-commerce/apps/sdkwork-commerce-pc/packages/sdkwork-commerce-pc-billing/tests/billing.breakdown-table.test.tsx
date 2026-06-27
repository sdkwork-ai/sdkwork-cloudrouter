import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react/theme";
import { SdkworkBillingBreakdownTable } from "../src";

describe("sdkwork-commerce-pc-billing breakdown table", () => {
  it("renders breakdown rows and routes row selection through onSelect", () => {
    const onSelect = vi.fn();

    render(
      <SdkworkThemeProvider defaultTheme="light">
        <SdkworkBillingBreakdownTable
          onSelect={onSelect}
          rows={[
            {
              changeRate: 4.2,
              costCny: 60,
              id: "openai",
              kind: "provider",
              label: "OpenAI",
              share: 60,
              units: 240000,
            },
            {
              changeRate: -2,
              costCny: 25,
              id: "anthropic",
              kind: "provider",
              label: "Anthropic",
              share: 25,
              units: 120000,
            },
          ]}
          selectedRowId={null}
        />
      </SdkworkThemeProvider>,
    );

    expect(screen.getByText("OpenAI")).toBeInTheDocument();
    expect(screen.getByText("Anthropic")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /openai/i,
      }),
    );

    expect(onSelect).toHaveBeenCalledWith("openai");
  });
});
