"use client";

import { useState } from "react";
import { PageShell } from "@/components/PageShell";

export default function DashboardPage() {
  const [selectedTimeRange, setSelectedTimeRange] = useState("1M");

  const todos = [
    { id: "1", text: "Review pending payroll approvals", completed: false },
    { id: "2", text: "Update employee tax information", completed: false },
    { id: "3", text: "Process Q1 bonus payments", completed: true },
    { id: "4", text: "Reconcile bank statements", completed: false },
  ];

  const notifications = [
    { id: "1", message: "Payroll run completed for March 2024", time: "2 hours ago", read: false },
    { id: "2", message: "3 employees require tax form updates", time: "5 hours ago", read: false },
    { id: "3", message: "New employee onboarding completed", time: "1 day ago", read: true },
  ];

  const insights = [
    { type: "warning", text: "2 employees have incomplete tax profiles" },
    { type: "info", text: "Payroll processing time improved by 15% this month" },
    { type: "success", text: "All compliance checks passed for Q1" },
  ];

  const recentPayrolls = [
    { period: "March 2024", amount: "$58,764.25", status: "Paid", date: "Mar 1, 2024" },
    { period: "February 2024", amount: "$55,230.10", status: "Paid", date: "Feb 1, 2024" },
    { period: "January 2024", amount: "$52,145.80", status: "Paid", date: "Jan 1, 2024" },
  ];

  return (
    <PageShell>
      <div className="space-y-6">
        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          {/* Left Column (70%) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Upcoming Payroll Card */}
            <div className="bg-card-bg rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-text-main">Upcoming Payroll</h2>
                <div className="flex items-center gap-2">
                  {["1M", "3M", "6M", "1Y"].map((range) => (
                    <button
                      key={range}
                      onClick={() => setSelectedTimeRange(range)}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                        selectedTimeRange === range
                          ? "bg-primary text-white"
                          : "bg-gray-100 text-text-muted hover:bg-gray-200"
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-sm text-text-muted mb-1">Pay Period</p>
                  <p className="text-lg font-semibold text-text-main">March 1-31, 2024</p>
                </div>
                <div>
                  <p className="text-sm text-text-muted mb-1">Payment Date</p>
                  <p className="text-lg font-semibold text-text-main">April 5, 2024</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                    PENDING
                  </span>
                  <span className="text-sm text-text-muted">Total: $62,450.00</span>
                </div>
                <button className="bg-primary text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm">
                  Run Payroll
                </button>
              </div>
            </div>

            {/* Payroll Actions Card */}
            <div className="bg-card-bg rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-text-main mb-4">Payroll Actions</h2>
              <div className="grid grid-cols-2 gap-4">
                <button className="flex items-center justify-center gap-2 px-6 py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-blue-50 transition-colors text-sm font-medium text-text-main">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Start new payroll cycle
                </button>
                <button className="flex items-center justify-center gap-2 px-6 py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-blue-50 transition-colors text-sm font-medium text-text-main">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Calculate paycheck
                </button>
              </div>
            </div>

            {/* Recent Payroll Card */}
            <div className="bg-card-bg rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-text-main">Recent Payroll</h2>
                <a href="#" className="text-sm text-primary hover:text-primary/80 font-medium">
                  View all
                </a>
              </div>

              {/* Simple Bar Chart */}
              <div className="h-48 mb-6 flex items-end justify-between gap-2">
                {[65, 55, 70, 60, 75, 65, 80].map((height, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-primary rounded-t-lg mb-2"
                      style={{ height: `${height}%` }}
                    ></div>
                    <span className="text-xs text-text-muted">
                      {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"][index]}
                    </span>
                  </div>
                ))}
              </div>

              {/* Summary Table */}
              <div className="border-t border-gray-200 pt-4">
                <table className="w-full">
                  <thead>
                    <tr className="text-left rtl:text-right text-xs font-medium text-text-muted uppercase">
                      <th className="pb-2">Period</th>
                      <th className="pb-2">Amount</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {recentPayrolls.map((payroll, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="py-3 text-sm font-medium text-text-main">{payroll.period}</td>
                        <td className="py-3 text-sm text-text-main">{payroll.amount}</td>
                        <td className="py-3">
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                            {payroll.status}
                          </span>
                        </td>
                        <td className="py-3 text-sm text-text-muted">{payroll.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Insights Card */}
            <div className="bg-card-bg rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-text-main mb-4">AI Insights</h2>
              <div className="space-y-3">
                {insights.map((insight, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      insight.type === "warning"
                        ? "bg-orange-50 border-orange-200"
                        : insight.type === "info"
                        ? "bg-blue-50 border-blue-200"
                        : "bg-green-50 border-green-200"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          insight.type === "warning"
                            ? "bg-orange-100"
                            : insight.type === "info"
                            ? "bg-blue-100"
                            : "bg-green-100"
                        }`}
                      >
                        {insight.type === "warning" && (
                          <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        )}
                        {insight.type === "info" && (
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        {insight.type === "success" && (
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <p className="text-sm text-text-main flex-1">{insight.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column (30%) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Top To-Dos Card */}
            <div className="bg-card-bg rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text-main">To-Dos</h2>
                <button className="text-sm text-primary hover:text-primary/80 font-medium">
                  View all
                </button>
              </div>
              <div className="space-y-3">
                {todos.map((todo) => (
                  <label
                    key={todo.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={todo.completed}
                      onChange={() => {}}
                      className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <span
                      className={`text-sm flex-1 ${
                        todo.completed ? "text-text-muted line-through" : "text-text-main"
                      }`}
                    >
                      {todo.text}
                    </span>
                  </label>
                ))}
              </div>
              <button className="mt-4 w-full text-sm text-primary hover:text-primary/80 font-medium text-center">
                + Add new task
              </button>
            </div>

            {/* Notifications Card */}
            <div className="bg-card-bg rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text-main">Notifications</h2>
                <button className="text-sm text-primary hover:text-primary/80 font-medium">
                  Mark all read
                </button>
              </div>
              <div className="space-y-3">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3 rounded-lg border ${
                      notif.read ? "bg-gray-50 border-gray-200" : "bg-blue-50 border-blue-200"
                    }`}
                  >
                    <p className="text-sm text-text-main mb-1">{notif.message}</p>
                    <p className="text-xs text-text-muted">{notif.time}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Mini Calendar Card */}
            <div className="bg-card-bg rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text-main">Calendar</h2>
                <div className="flex items-center gap-2">
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="text-center mb-4">
                <p className="text-sm font-semibold text-text-main">March 2024</p>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                  <div key={day} className="text-xs font-medium text-text-muted text-center py-1">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {[
                  null, null, null, null, null, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
                  20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
                ].map((date, index) => (
                  <div
                    key={index}
                    className={`aspect-square flex items-center justify-center text-xs ${
                      date === 5
                        ? "bg-primary text-white rounded-full font-semibold"
                        : date
                        ? "text-text-main hover:bg-gray-100 rounded cursor-pointer"
                        : "text-gray-300"
                    }`}
                  >
                    {date}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
