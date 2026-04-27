"use client";
import { useState, useMemo } from "react";
import "../styles/dashboard.css";
import Header from "./Header";
import DatePicker from "./DatePicker";
import MainView from "../views/MainView";
import TrendView from "../views/TrendView";
import GoalModal from "./GoalModal";
import PdfExportModal from "./PdfExportModal";
import { useCustomers } from "../hooks/useCustomers";
import { useSales } from "../hooks/useSales";
import { useGoals } from "../hooks/useGoals";
import { toISODate, getThisWeek } from "../utils/dateUtils";

export default function Dashboard() {
  const [selectedStaff, setSelectedStaff] = useState("チーム全体");
  const [selectedPeriod, setSelectedPeriod] = useState("thisMonth");
  const [customDateRange, setCustomDateRange] = useState(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const isCustomDate = !!customDateRange;
  const apiStaff = selectedStaff === "チーム全体" ? "全員" : selectedStaff;

  let apiPeriod = selectedPeriod === "trends" ? "fiscal" : selectedPeriod;
  let apiDateRange = null;

  if (isCustomDate) {
    apiPeriod = "custom";
    apiDateRange = customDateRange;
  } else if (selectedPeriod === "thisWeek") {
    const w = getThisWeek();
    apiPeriod = "custom";
    apiDateRange = { start: toISODate(w.start), end: toISODate(w.end) };
  }

  const { customers, loading: loadingCustomers, refetch } = useCustomers();
  const { sales, loading: loadingSales } = useSales(apiPeriod, apiStaff, apiDateRange);
  const { sales: lastMonthSales } = useSales("lastMonth", apiStaff);
  const { goals, saveGoal } = useGoals();

  const salesTarget = useMemo(() => {
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (selectedStaff === 'チーム全体') {
      const teamGoal = goals.find(g => g.staff === 'チーム全体' && g.month === monthStr);
      return teamGoal ? Number(teamGoal.salesTarget) || 0 : 0;
    }
    const g = goals.find(g => g.staff === selectedStaff && g.month === monthStr);
    return g ? Number(g.salesTarget) || 0 : 0;
  }, [goals, selectedStaff]);

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    setCustomDateRange(null);
    setShowDatePicker(false);
  };

  const handleDateApply = (range) => {
    setCustomDateRange(range);
    setShowDatePicker(false);
  };

  const dateLabel = isCustomDate
    ? `${customDateRange.start} ~ ${customDateRange.end}`
    : null;

  if (loadingCustomers && customers.length === 0) {
    return <div className="dashboard-loading">読み込み中...</div>;
  }

  const showMain = selectedPeriod !== "trends";

  return (
    <div className="dashboard">
      <div style={{ position: 'relative' }}>
        <Header
          selectedStaff={selectedStaff}
          onStaffChange={setSelectedStaff}
          selectedPeriod={selectedPeriod}
          onPeriodChange={handlePeriodChange}
          onGoalClick={() => setShowGoalModal(true)}
          onPdfClick={() => setShowPdfModal(true)}
          dateLabel={dateLabel}
          onDateClick={() => setShowDatePicker(!showDatePicker)}
          isCustomDate={isCustomDate}
        />
        {showDatePicker && (
          <DatePicker
            onApply={handleDateApply}
            onClose={() => setShowDatePicker(false)}
          />
        )}
      </div>

      {showMain && (
        <MainView
          customers={customers}
          sales={sales}
          loadingSales={loadingSales}
          lastMonthSales={lastMonthSales}
          goals={goals}
          salesTarget={salesTarget}
          selectedStaff={selectedStaff}
          selectedPeriod={selectedPeriod}
          customDateRange={customDateRange}
          onRefresh={refetch}
        />
      )}

      {!showMain && (
        <TrendView
          customers={customers}
          selectedStaff={selectedStaff}
        />
      )}

      {showGoalModal && (
        <GoalModal
          goals={goals}
          onSave={saveGoal}
          onClose={() => setShowGoalModal(false)}
        />
      )}

      {showPdfModal && (
        <PdfExportModal
          onClose={() => setShowPdfModal(false)}
          selectedStaff={selectedStaff}
          selectedPeriod={selectedPeriod}
          customers={customers}
          sales={sales}
          lastMonthSales={lastMonthSales}
          goals={goals}
          salesTarget={salesTarget}
        />
      )}
    </div>
  );
}
