import {
  render,
  screen,
} from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react/theme";
import { SdkworkSubscriptionLevelGrid } from "../src/components/subscription-level-grid";

describe("sdkwork-commerce-pc-subscription level grid", () => {
  it("renders the reusable membership ladder and current level state", () => {
    render(
      <SdkworkThemeProvider defaultTheme="light">
        <SdkworkSubscriptionLevelGrid
          levels={[
            {
              description: "Best for professional creators.",
              id: "membership-level-3",
              isCurrent: true,
              levelValue: 3,
              name: "Pro",
              requiredPoints: 500,
            },
            {
              description: "For studios with advanced workflows.",
              id: "membership-level-4",
              isCurrent: false,
              levelValue: 4,
              name: "Studio",
              requiredPoints: 900,
            },
          ]}
        />
      </SdkworkThemeProvider>,
    );

    expect(screen.getByRole("heading", { name: /membership levels/i })).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("Studio")).toBeInTheDocument();

    const levelGrid = screen.getByRole("heading", { name: /membership levels/i }).closest("section");
    expect(levelGrid).not.toBeNull();
    expect(levelGrid?.className).toContain("shadow-[var(--sdk-shadow-md)]");
    expect(levelGrid?.className).not.toContain("shadow-[0_18px_48px_rgba");

    const pointsChip = screen.getByText(/500 points/i);
    expect(pointsChip.className).toContain("shadow-[var(--sdk-shadow-soft)]");
    expect(pointsChip.className).not.toContain("bg-white");
  });

  it("renders an empty state when the runtime exposes no levels", () => {
    render(
      <SdkworkThemeProvider defaultTheme="light">
        <SdkworkSubscriptionLevelGrid levels={[]} />
      </SdkworkThemeProvider>,
    );

    expect(screen.getByText(/membership level comparison will appear/i)).toBeInTheDocument();
  });
});
