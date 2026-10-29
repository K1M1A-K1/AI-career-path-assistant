import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; compact?: boolean }
interface State { failed: boolean }

/** NF-06: malformed data must never white-screen the demo. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };
  static getDerivedStateFromError(): State { return { failed: true }; }
  componentDidCatch(error: unknown) { console.error("UI error boundary:", error); }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className={`rounded-xl border border-red-200 bg-red-50 text-red-900 ${this.props.compact ? "p-3 text-xs" : "m-6 p-6 text-sm"}`}>
        <p className="font-bold">مشکلی در نمایش این بخش پیش آمد.</p>
        <button type="button" className="btn-ghost mt-2" onClick={() => this.setState({ failed: false })}>تلاش مجدد</button>
      </div>
    );
  }
}
