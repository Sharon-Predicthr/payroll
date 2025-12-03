"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";

const navigation = [
  { label: "Overview", href: "#", badge: "Live" },
  { label: "Payroll Runs", href: "#", badge: "4 due" },
  { label: "Adjustments", href: "#", badge: "" },
  { label: "Benefits", href: "#", badge: "" },
  { label: "Compliance", href: "#", badge: "2" },
  { label: "Integrations", href: "#", badge: "" }
];

const stats = [
  {
    label: "Total Payroll",
    value: "$482,450",
    change: "+12.4%",
    helper: "vs last month"
  },
  {
    label: "Avg. Cost / Employee",
    value: "$6,250",
    change: "-2.1%",
    helper: "steady trend"
  },
  {
    label: "Net Retention",
    value: "98.2%",
    change: "+0.8%",
    helper: "healthy range"
  },
  {
    label: "Anomalies",
    value: "3 flagged",
    change: "Review",
    helper: "2 high priority"
  }
];

const payrollRuns = [
  {
    id: "APR-16",
    title: "Mid-Month Payroll",
    amount: "$182,960",
    status: "Processing",
    progress: 68,
    due: "Due in 2 days"
  },
  {
    id: "APR-30",
    title: "End of Month Payroll",
    amount: "$299,490",
    status: "Draft",
    progress: 24,
    due: "Scheduled"
  },
  {
    id: "Q2-BONUS",
    title: "Quarterly Bonus Cycle",
    amount: "$94,100",
    status: "Review",
    progress: 52,
    due: "Needs approval"
  }
];

const activityFeed = [
  {
    title: "Israel HQ payroll approved",
    meta: "Aya Cohen • 08:40",
    tone: "success"
  },
  {
    title: "Brazil contractor rate updated",
    meta: "Diego Lima • 07:25",
    tone: "neutral"
  },
  {
    title: "US overtime exceeds policy limits",
    meta: "System alert • 06:05",
    tone: "warning"
  }
];

export default function PayrollDashboardPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [direction, setDirection] = useState<"rtl" | "ltr">("rtl");

  const directionLabel = useMemo(
    () => (direction === "rtl" ? "RTL" : "LTR"),
    [direction]
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" dir={direction}>
      <div className="flex min-h-screen flex-col lg:flex-row">
        <button
          type="button"
          className="flex items-center gap-2 bg-white p-4 text-right text-base font-medium shadow lg:hidden"
          onClick={() => setIsSidebarOpen((prev) => !prev)}
          aria-expanded={isSidebarOpen}
        >
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100">
            ☰
          </span>
          ניווט
        </button>

        <aside
          className={clsx(
            "w-full max-w-xs border-slate-200 bg-white px-6 py-8 transition-all duration-200 lg:static lg:block",
            "lg:min-h-screen lg:border-e",
            isSidebarOpen ? "block border-b" : "hidden border-b lg:block"
          )}
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Payroll</p>
              <p className="text-xl font-semibold text-slate-900">
                Sapphire Inc.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setDirection((prev) => (prev === "rtl" ? "ltr" : "rtl"))
              }
              className="rounded-full border border-slate-200 px-4 py-1 text-xs font-semibold uppercase text-slate-600 transition hover:bg-slate-50"
            >
              {directionLabel}
            </button>
          </div>

          <nav className="space-y-2">
            {navigation.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                {item.label}
                {item.badge ? (
                  <span className="rounded-full bg-slate-900/90 px-2 py-0.5 text-xs font-semibold text-white">
                    {item.badge}
                  </span>
                ) : null}
              </a>
            ))}
          </nav>

          <div className="mt-8 rounded-3xl bg-slate-900/95 p-5 text-white">
            <p className="text-sm text-white/60">Forecast</p>
            <p className="mt-2 text-2xl font-semibold">$1.4M</p>
            <p className="text-sm text-white/70">Projected Q2 payroll spend</p>
            <div className="mt-4 rounded-2xl bg-white/10 p-3 text-xs text-white/80">
              AI anomaly guard is active across 6 entities.
            </div>
          </div>
        </aside>

        <main className="flex-1 space-y-6 p-6 lg:p-10">
          <header className="flex flex-wrap items-center gap-4 rounded-3xl border border-slate-200 bg-white px-6 py-4">
            <div>
              <p className="text-sm text-slate-500">Current cycle</p>
              <p className="text-xl font-semibold text-slate-900">
                April 2025 payroll
              </p>
            </div>

            <div className="flex-1" />

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                🔍
                <input
                  type="search"
                  placeholder="Search employees, runs..."
                  className="w-48 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 sm:w-64"
                />
              </label>
              <button className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
                Export
              </button>
              <button className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
                Run payroll
              </button>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <article
                key={stat.label}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-xs uppercase text-slate-500">
                  {stat.label}
                </p>
                <p className="mt-3 text-2xl font-semibold text-slate-900">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-slate-500">{stat.helper}</p>
                <p className="mt-3 text-sm font-semibold text-emerald-600">
                  {stat.change}
                </p>
              </article>
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold text-slate-900">
                  Active payroll runs
                </p>
                <button className="text-sm font-medium text-slate-500 hover:text-slate-900">
                  View all
                </button>
              </div>

              <div className="space-y-4">
                {payrollRuns.map((run) => (
                  <article
                    key={run.id}
                    className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <div>
                        <p className="text-xs uppercase text-slate-500">
                          {run.id}
                        </p>
                        <p className="text-lg font-semibold text-slate-900">
                          {run.title}
                        </p>
                      </div>
                      <div className="flex-1" />
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {run.status}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-4">
                      <p className="text-2xl font-semibold text-slate-900">
                        {run.amount}
                      </p>
                      <p className="text-sm text-slate-500">{run.due}</p>
                      <div className="flex-1" />
                      <div className="w-full rounded-full bg-slate-100">
                        <div
                          className="rounded-full bg-slate-900 py-1 text-xs text-white"
                          style={{ width: `${run.progress}%` }}
                        />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-lg font-semibold text-slate-900">
                  Activity feed
                </p>
                <ul className="mt-4 space-y-4">
                  {activityFeed.map((item) => (
                    <li key={item.title}>
                      <p className="text-sm font-medium text-slate-900">
                        {item.title}
                      </p>
                      <p
                        className={clsx(
                          "text-xs",
                          item.tone === "warning"
                            ? "text-amber-600"
                            : item.tone === "success"
                            ? "text-emerald-600"
                            : "text-slate-500"
                        )}
                      >
                        {item.meta}
                      </p>
                    </li>
                  ))}
                </ul>
              </article>

              <article className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-5 text-center shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Need more automation?
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  Connect finance stack
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Sync expenses, attendance, and ERP cost centers in minutes.
                </p>
                <button className="mt-4 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                  Add integration
                </button>
              </article>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
