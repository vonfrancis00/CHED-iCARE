import { Component } from "react";

export default class AppErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error("Dashboard failed to render", error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <section className="card max-w-lg p-8" role="alert">
          <h1 className="text-xl font-semibold">Unable to open the dashboard</h1>
          <p className="mt-3 text-sm">Your sign-in succeeded, but the page could not load. Reload to try again.</p>
          <button type="button" className="mt-5 rounded-xl bg-blue-700 px-4 py-2 text-white" onClick={() => window.location.replace("/")}>Reload dashboard</button>
        </section>
      </main>
    );
  }
}
