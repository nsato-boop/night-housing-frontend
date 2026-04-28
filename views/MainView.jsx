"use client";
import HeroSection from "../components/HeroSection";
import RevenueBoxes from "../components/RevenueBoxes";
import RevenueChart from "../components/RevenueChart";
import Pipeline from "../components/Pipeline";
import SalesRanking from "../components/SalesRanking";
import PaymentConfirmation from "../components/PaymentConfirmation";
import TeamPaymentConfirmation from "../components/TeamPaymentConfirmation";
import ActivityFeed from "../components/ActivityFeed";

export default function MainView({
  customers, sales, loadingSales, lastMonthSales, goals, salesTarget,
  selectedStaff, selectedPeriod, customDateRange, onRefresh,
}) {
  const isPersonal = selectedStaff !== 'チーム全体';
  return (
    <>
      {/* Row 1: ヒーロー(左2/3) + 成約サマリー(右1/3) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: 12,
        marginBottom: 12,
      }}>
        <HeroSection
          customers={customers}
          sales={sales}
          loadingSales={loadingSales}
          lastMonthSales={lastMonthSales}
          goals={goals}
          selectedStaff={selectedStaff}
          selectedPeriod={selectedPeriod}
          customDateRange={customDateRange}
        />
        <RevenueBoxes
          sales={sales}
          loadingSales={loadingSales}
          lastMonthSales={lastMonthSales}
          salesTarget={salesTarget}
          customers={customers}
          selectedStaff={selectedStaff}
          selectedPeriod={selectedPeriod}
        />
      </div>

      {/* Row 2: 売上推移チャート(左1.3/2) + パイプライン(右1/2) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.3fr 1fr',
        gap: 12,
        marginBottom: 12,
      }}>
        <RevenueChart selectedStaff={selectedStaff} />
        <Pipeline customers={customers} selectedStaff={selectedStaff} />
      </div>

      {/* Row 3: ランキング + 着金確認 + アクティビティ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 12,
      }}>
        {isPersonal ? (
          <PaymentConfirmation customers={customers} selectedStaff={selectedStaff} selectedPeriod={selectedPeriod} customDateRange={customDateRange} onRefresh={onRefresh} />
        ) : (
          <SalesRanking selectedStaff={selectedStaff} selectedPeriod={selectedPeriod} />
        )}
        <TeamPaymentConfirmation
          customers={customers}
          selectedStaff={selectedStaff}
          selectedPeriod={selectedPeriod}
          customDateRange={customDateRange}
          onRefresh={onRefresh}
        />
        <ActivityFeed customers={customers} selectedStaff={selectedStaff} />
      </div>
    </>
  );
}
