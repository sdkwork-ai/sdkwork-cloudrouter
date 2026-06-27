import { Component, type ErrorInfo, type ReactNode } from "react";

interface CommerceErrorBoundaryProps {
  children: ReactNode;
}

interface CommerceErrorBoundaryState {
  error: Error | null;
}

export class CommerceErrorBoundary extends Component<
  CommerceErrorBoundaryProps,
  CommerceErrorBoundaryState
> {
  state: CommerceErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): CommerceErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("sdkwork-commerce-pc render error", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6 text-center">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            {this.state.error.message || "An unexpected error occurred while rendering this page."}
          </p>
          <button
            className="rounded-md border px-4 py-2 text-sm"
            onClick={() => this.setState({ error: null })}
            type="button"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
