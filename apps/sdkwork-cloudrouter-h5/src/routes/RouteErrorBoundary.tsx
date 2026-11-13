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
        <div className="border-b border-line bg-danger-soft px-[0.9rem] py-4 text-xs text-danger">
          <p className="font-semibold">{this.props.labels.title}</p>
          <p className="mt-1 text-[11px] leading-5 opacity-80">{this.props.labels.message}</p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-2 rounded-md border border-danger/40 px-2.5 py-1 text-[11px] font-medium"
          >
            {this.props.labels.retry}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
