import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface RouteErrorBoundaryLabels {
  readonly title: string;
  readonly message: string;
  readonly retry: string;
}

export interface RouteErrorBoundaryProps {
  readonly labels: RouteErrorBoundaryLabels;
  readonly children: ReactNode;
}

interface RouteErrorBoundaryState {
  readonly hasError: boolean;
}

/**
 * Route-level crash boundary. A screen render exception must not white-screen the
 * whole shell: the boundary keeps the surrounding layout alive and renders a
 * minimal localized fallback with a retry action. Labels are passed in because a
 * class component cannot read the runtime translator context.
 */
export class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): RouteErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Bounded diagnostics only: the error itself, no payload or user data.
    console.error('[cloudrouter-h5] route render failed:', error, errorInfo.componentStack);
  }

  private readonly handleRetry = () => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">
          <p className="font-medium">{this.props.labels.title}</p>
          <p className="mt-1 text-[11px] text-red-200/80">{this.props.labels.message}</p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-2 rounded-md border border-red-400/60 px-2 py-1 text-[11px]"
          >
            {this.props.labels.retry}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
