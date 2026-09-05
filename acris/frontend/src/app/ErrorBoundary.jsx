import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("React error boundary caught:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="acris-card max-w-lg p-6 text-center">
            <p className="acris-label">Application error</p>
            <h2 className="mt-3 font-display text-2xl text-white">
              Something went wrong
            </h2>
            <p className="mt-3 text-sm text-slate-400">
              The app needs to be refreshed. This is the standard fallback for
              the new routed shell.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
