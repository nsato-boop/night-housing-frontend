"use client";
import { useState, useEffect, useRef } from "react";
import { Home, Calendar, Users, GitBranch, Wallet, UserCheck, TrendingUp, CheckCircle, AlertTriangle, AlertCircle, MessageSquare, Clock, ArrowUpRight, ArrowDownRight, ChevronDown, ChevronLeft, ChevronRight, Plus, Search, X, Edit3, Zap, BarChart3, Target, Award } from "lucide-react";

// 現在月のみ（データが蓄積されたら自動で増える）
const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();
const CURRENT_MONTH = NOW.getMonth() + 1; // 1-12
const MONTHS = [`${CURRENT_MONTH}月`];
const YEAR_MONTHS = Array.from({length:12}, (_,i) => `${CURRENT_YEAR}/${String(i+1).padStart(2,"0")}`);
const STAFF = ["澤田","中尾","松井","茂木","田中和弘","長田","太森","小川","対応者不明"];

// 内部名 → 表示名マッピング
const STAFF_DISPLAY_MAP = {};
const displayStaffName = (name) => STAFF_DISPLAY_MAP[name] || name || "";
const STATUSES = ["未対応","物件提案中","内見","審査中","審査通過済み（契約準備中）","仲介手数料着金済み","その他売上着金済み","契約済み","AD着金済み","失注（離脱中・シナリオ配信中）","生活保護","追客（物件提案）"];
// 移行率計算用のステージ順（失注等を除く）
const PIPELINE_ORDER = ["未対応","物件提案中","内見","審査中","審査通過済み（契約準備中）","仲介手数料着金済み","その他売上着金済み","契約済み","AD着金済み"];
// 契約数カウント用ステータス（契約済み + AD着金済みのみ）
const CONTRACTED_STATUSES = new Set(["契約済み","AD着金済み"]);

// === 売上3定義 ===
// 見込み: 審査通過済み以降の全売上合計
function calcProspectRevenue(custs) {
  const idx = PIPELINE_ORDER.indexOf("審査通過済み（契約準備中）");
  return custs.filter(c => PIPELINE_ORDER.indexOf(c.status) >= idx).reduce((s,c) => s + (c.commission||0) + (c.ad||0) + (c.otherRevenue||0), 0);
}
// 契約ベース: 契約済み/AD着金済みの全売上合計
function calcContractRevenue(custs) {
  return custs.filter(c => CONTRACTED_STATUSES.has(c.status)).reduce((s,c) => s + (c.commission||0) + (c.ad||0) + (c.otherRevenue||0), 0);
}
// 着金ベース: 着金確認済みの種別のみ加算
function calcPaidRevenue(custs) {
  const feeIdx = PIPELINE_ORDER.indexOf("仲介手数料着金済み");
  const otherIdx = PIPELINE_ORDER.indexOf("その他売上着金済み");
  return custs.reduce((s,c) => {
    const si = PIPELINE_ORDER.indexOf(c.status); let r = 0;
    if (si >= feeIdx) r += (c.commission||0);
    if (si >= otherIdx) r += (c.otherRevenue||0);
    if (c.status === "AD着金済み") r += (c.ad||0);
    return s + r;
  }, 0);
}
const STATUS_STYLE = {
  "未対応":        { bg:"#E0F2FE", text:"#0369A1" },
  "物件提案中":    { bg:"#F3E8FF", text:"#7C3AED" },
  "内見":          { bg:"#D1FAE5", text:"#059669" },
  "審査中":        { bg:"#FCE7F3", text:"#DB2777" },
  "審査通過済み（契約準備中）": { bg:"#E0E7FF", text:"#4338CA" },
  "仲介手数料着金済み": { bg:"#CCFBF1", text:"#0F766E" },
  "その他売上着金済み": { bg:"#CFFAFE", text:"#0891B2" },
  "契約済み":      { bg:"#D1FAE5", text:"#059669" },
  "AD着金済み":    { bg:"#FEF3C7", text:"#B45309" },
  "失注（離脱中・シナリオ配信中）": { bg:"#F1F5F9", text:"#64748B" },
  "生活保護":      { bg:"#FCE7F3", text:"#DB2777" },
  "追客（物件提案）": { bg:"#FFEDD5", text:"#C2410C" },
};

// 停滞アラート閾値（時間）
const STAGNATION_THRESHOLDS = {
  "未対応": 1,
  "物件提案中": 72,
  "内見": 72,
  "審査中": 72,
  "審査通過済み（契約準備中）": 72,
  "仲介手数料着金済み": 48,
  "その他売上着金済み": 48,
  "契約済み": 72,
};

// デザイントークン（ライトテーマ）
const DS = {
  green:   "#0F766E",
  greenBg: "#F0FDFA",
  blue:    "#4F46E5",
  blueBg:  "#EEF2FF",
  orange:  "#D97706",
  red:     "#E11D48",
  redBg:   "#FFF1F2",
  beige:   "#F8FAFC",
  card:    "#FFFFFF",
  border:  "#E2E8F0",
  text1:   "#1E293B",
  text2:   "#64748B",
  text3:   "#94A3B8",
  shadow:  "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  shadowHover: "0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
  radius:  12,
  radiusSm: 8,
  pageBg:  "#F8FAFC",
  sidebar: "#FFFFFF",
  hover:   "#F1F5F9",
  teal:    "#0F766E",
  tealLight: "#0F766E",
  indigo:  "#4F46E5",
  indigoLight: "#4F46E5",
  amber:   "#D97706",
  amberLight: "#D97706",
  emerald: "#059669",
  rose:    "#E11D48",
};

// カードコンポーネント
function Card({ children, style={}, hover=false }) {
  const [isHover, setIsHover] = useState(false);
  return (
    <div
      onMouseEnter={()=>hover&&setIsHover(true)}
      onMouseLeave={()=>hover&&setIsHover(false)}
      style={{ background:DS.card, borderRadius:DS.radius, padding:"24px", border:`1px solid ${DS.border}`, boxShadow:isHover?DS.shadowHover:DS.shadow, transition:"box-shadow 0.2s", ...style }}
    >{children}</div>
  );
}

// KPIカード
function KpiCard({ label, value, sub, icon, color=DS.teal, bg=DS.greenBg, growth, size="md" }) {
  const sizes = {
    lg: { padding:"32px 28px", icon:20, label:13, value:36, sub:13, minW:200 },
    md: { padding:"24px 20px", icon:18, label:12, value:28, sub:12, minW:160 },
    sm: { padding:"20px 16px", icon:16, label:11, value:22, sub:11, minW:100 },
  };
  const s = sizes[size] || sizes.md;
  return (
    <div style={{ background:DS.card, borderRadius:DS.radius, padding:s.padding, flex:1, minWidth:s.minW, border:`1px solid ${DS.border}`, boxShadow:DS.shadow, transition:"box-shadow 0.2s" }}>
      {icon && <div style={{ marginBottom:8, color:DS.text3 }}>{icon}</div>}
      <div style={{ fontSize:s.label, fontWeight:500, color:DS.text2, letterSpacing:"0.04em", marginBottom:8 }}>{label}</div>
      <div style={{ fontSize:s.value, fontWeight:700, color:DS.text1, lineHeight:1, letterSpacing:"-0.02em", fontVariantNumeric:"tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontSize:s.sub, color:DS.text2, marginTop:6 }}>{sub}</div>}
      {growth!==undefined && (
        <div style={{ fontSize:11, marginTop:8, color:growth>=0?DS.emerald:DS.rose, fontWeight:500, display:"flex", alignItems:"center", gap:4 }}>
          {growth>=0 ? <ArrowUpRight size={14} strokeWidth={1.5}/> : <ArrowDownRight size={14} strokeWidth={1.5}/>} {Math.abs(growth)}% 先月比
        </div>
      )}
    </div>
  );
}

// セクションヘッダー
function SectionLabel({ children }) {
  return <div style={{ fontSize:11, fontWeight:600, color:DS.text3, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12 }}>{children}</div>;
}

// バッジ
function Badge({ status }) {
  const s = STATUS_STYLE[status] || { bg:"#F1F5F9", text:"#64748B" };
  return <span style={{ fontSize:11, padding:"4px 12px", borderRadius:20, background:s.bg, color:s.text, fontWeight:600, whiteSpace:"nowrap", letterSpacing:"0.02em" }}>{status}</span>;
}

const PIPELINE_STAGES = ["問い合わせ","初回面談","物件提案中","交渉中","契約締結"];
const PIPELINE_STYLE = {
  "問い合わせ": { bg:"#EEF2FF", text:DS.indigo },
  "初回面談":   { bg:"#D1FAE5", text:DS.emerald },
  "物件提案中": { bg:"#FEF3C7", text:DS.amber },
  "交渉中":     { bg:"#FFEDD5", text:DS.amber },
  "契約締結":   { bg:"#D1FAE5", text:DS.emerald },
};

// 担当者スタイル設定
const TEAM_STYLE = {
  "澤田":     { color:DS.indigo, bg:"#EEF2FF" },
  "中尾":     { color:DS.emerald, bg:"#D1FAE5" },
  "松井":     { color:DS.teal, bg:"#F0FDFA" },
  "茂木":     { color:DS.amber, bg:"#FEF3C7" },
  "田中和弘": { color:DS.rose, bg:"#FFF1F2" },
  "長田":     { color:"#7C3AED", bg:"#F5F3FF" },
  "太森":     { color:DS.emerald, bg:"#D1FAE5" },
  "小川":     { color:DS.teal, bg:"#F0FDFA" },
};

// 顧客データからチームデータを自動生成
function buildTeamFromCustomers(customers) {
  return STAFF.map(name => {
    const style = TEAM_STYLE[name] || { color:DS.indigo, bg:"#EEF2FF" };
    const mine = customers.filter(c => c.assigned === name);
    const contracted = mine.filter(c => CONTRACTED_STATUSES.has(c.status)).length;
    const revenue = mine.reduce((s, c) => {
      const si = PIPELINE_ORDER.indexOf(c.status);
      const feeIdx = PIPELINE_ORDER.indexOf("仲介手数料着金済み");
      const otherIdx = PIPELINE_ORDER.indexOf("その他売上着金済み");
      let r = 0;
      if (si >= feeIdx) r += (c.commission || 0);
      if (si >= otherIdx) r += (c.otherRevenue || 0);
      if (c.status === "AD着金済み") r += (c.ad || 0);
      return s + r;
    }, 0);
    const rate = mine.length > 0 ? (contracted / mine.length) * 100 : 0;
    const withReply = mine.filter(c => c.avgReplyMin > 0);
    const avgReply = withReply.length > 0 ? Math.round(withReply.reduce((s, c) => s + c.avgReplyMin, 0) / withReply.length) : 0;
    return {
      name,
      color: style.color,
      bg: style.bg,
      deals: contracted,
      revenue,
      monthlyRate: [rate],
      contacted: mine.length,
      contracted,
      avgReply,
      replyRate: 0,
      monthlyReplySpeed: [avgReply],
      monthlyReplyRate: [0],
      stages: {},
    };
  });
}

// 顧客データから売上管理データを自動生成
function buildRevenueFromCustomers(customers) {
  const items = [];
  let id = 1;
  const contractIdx = PIPELINE_ORDER.indexOf("審査通過済み（契約準備中）");
  // 着金予定日から月を抽出するヘルパー
  const dateToMonth = (d) => d ? d.replace(/-/g, "/").substring(0, 7) : "";
  customers.forEach(c => {
    const si = PIPELINE_ORDER.indexOf(c.status);
    if (si < contractIdx && si !== -1) return;
    if (si === -1 && c.status !== "失注（離脱中・シナリオ配信中）") return;
    const addedMonth = c.addedDate ? c.addedDate.substring(0, 7).replace("-", "/") : "";
    const feeIdx = PIPELINE_ORDER.indexOf("仲介手数料着金済み");
    const otherIdx = PIPELINE_ORDER.indexOf("その他売上着金済み");
    const isFeePaid = si >= feeIdx;
    const isAdPaid = c.status === "AD着金済み";
    const isOtherPaid = si >= otherIdx;
    if (c.commission > 0) {
      const month = dateToMonth(c.feePaymentDate) || addedMonth;
      items.push({
        id: id++, lineUserId: c.lineUserId || c.id, customerId: c.id,
        name: c.name, caseName: c.caseName || "", type: "仲介手数料",
        amount: c.commission, month, addedMonth,
        paidDate: c.feePaymentDate || "",
        receivedDate: c.feeReceivedDate || "",
        receivedField: "feeReceivedDate",
        status: isFeePaid ? "入金済" : "未収",
        assigned: c.assigned || "", customerStatus: c.status,
      });
    }
    if (c.ad > 0) {
      const month = dateToMonth(c.adPaymentDate) || dateToMonth(c.feePaymentDate) || addedMonth;
      items.push({
        id: id++, lineUserId: c.lineUserId || c.id, customerId: c.id,
        name: c.name, caseName: c.caseName || "", type: "AD",
        amount: c.ad, month, addedMonth,
        paidDate: c.adPaymentDate || "",
        receivedDate: c.adReceivedDate || "",
        receivedField: "adReceivedDate",
        status: isAdPaid ? "入金済" : "未収",
        assigned: c.assigned || "", customerStatus: c.status,
      });
    }
    if (c.otherRevenue > 0) {
      const month = dateToMonth(c.otherRevenuePaymentDate) || dateToMonth(c.feePaymentDate) || addedMonth;
      items.push({
        id: id++, lineUserId: c.lineUserId || c.id, customerId: c.id,
        name: c.name, caseName: c.caseName || "", type: "その他売上",
        amount: c.otherRevenue, month, addedMonth,
        paidDate: c.otherRevenuePaymentDate || "",
        receivedDate: c.otherRevenueReceivedDate || "",
        receivedField: "otherRevenueReceivedDate",
        status: isOtherPaid ? "入金済" : "未収",
        assigned: c.assigned || "", customerStatus: c.status,
      });
    }
  });
  return items;
}

// 顧客データから着金リストを自動生成
function buildPaymentsFromCustomers(customers) {
  const contractIdx = PIPELINE_ORDER.indexOf("審査通過済み（契約準備中）");
  const feeIdx = PIPELINE_ORDER.indexOf("仲介手数料着金済み");
  const otherIdx = PIPELINE_ORDER.indexOf("その他売上着金済み");
  const items = [];
  let id = 1;
  customers
    .filter(c => {
      const si = PIPELINE_ORDER.indexOf(c.status);
      return si >= contractIdx || c.paymentDate || c.feePaymentDate || c.adPaymentDate || c.otherRevenuePaymentDate;
    })
    .forEach(c => {
      const si = PIPELINE_ORDER.indexOf(c.status);
      const isFeePaid = si >= feeIdx;
      const isAdPaid = c.status === "AD着金済み";
      const isOtherPaid = si >= otherIdx;
      if (c.commission > 0) {
        items.push({
          id: id++,
          customerId: c.id,
          lineUserId: c.lineUserId || c.id,
          name: `${c.name} 様`,
          property: c.caseName || "",
          amount: c.commission,
          type: "仲介手数料",
          status: isFeePaid ? "着金" : "未着金",
          date: c.feePaymentDate || "",
          assigned: c.assigned || "",
        });
      }
      if (c.ad > 0) {
        items.push({
          id: id++,
          customerId: c.id,
          lineUserId: c.lineUserId || c.id,
          name: `${c.name} 様`,
          property: c.caseName || "",
          amount: c.ad,
          type: "AD",
          status: isAdPaid ? "着金" : "未着金",
          date: c.adPaymentDate || "",
          assigned: c.assigned || "",
        });
      }
      if (c.otherRevenue > 0) {
        items.push({
          id: id++,
          customerId: c.id,
          lineUserId: c.lineUserId || c.id,
          name: `${c.name} 様`,
          property: c.caseName || "",
          amount: c.otherRevenue,
          type: "その他売上",
          status: isOtherPaid ? "着金" : "未着金",
          date: c.otherRevenuePaymentDate || "",
          assigned: c.assigned || "",
        });
      }
    });
  return items;
}

// コホート別着金フローを計算
function buildCohortFlow(allCustomers, targetMonth) {
  const contractIdx = PIPELINE_ORDER.indexOf("審査通過済み（契約準備中）");
  const feeIdx = PIPELINE_ORDER.indexOf("仲介手数料着金済み");
  const otherIdx = PIPELINE_ORDER.indexOf("その他売上着金済み");

  // 着金予定月がtargetMonthに該当する顧客を抽出
  const eligible = allCustomers.filter(c => {
    const si = PIPELINE_ORDER.indexOf(c.status);
    if (si < contractIdx && si !== -1) return false;
    if (si === -1 && c.status !== "失注（離脱中・シナリオ配信中）") return false;
    const total = (c.commission || 0) + (c.ad || 0) + (c.otherRevenue || 0);
    if (total <= 0) return false;
    // 着金予定日で判定
    const dates = [c.feePaymentDate, c.adPaymentDate, c.otherRevenuePaymentDate].filter(Boolean);
    if (dates.length > 0) {
      return dates.some(d => d.replace(/-/g, "/").substring(0, 7) === targetMonth);
    }
    // 着金予定日未入力：ステータス変更月で仮判定
    const addedMonth = c.addedDate ? c.addedDate.substring(0, 7).replace("-", "/") : "";
    return addedMonth === targetMonth || targetMonth === `${CURRENT_YEAR}/${String(CURRENT_MONTH).padStart(2, "0")}`;
  });

  // コホート（友だち追加月）別にグループ化
  const cohortMap = {};
  for (const c of eligible) {
    const addedMonth = c.addedDate ? c.addedDate.substring(0, 7).replace("-", "/") : "不明";
    if (!cohortMap[addedMonth]) cohortMap[addedMonth] = { month: addedMonth, customers: [] };
    cohortMap[addedMonth].customers.push(c);
  }

  const cohorts = Object.values(cohortMap).sort((a, b) => a.month.localeCompare(b.month)).map(cohort => {
    let expected = 0, collected = 0;
    const details = cohort.customers.map(c => {
      const si = PIPELINE_ORDER.indexOf(c.status);
      const fee = c.commission || 0;
      const ad = c.ad || 0;
      const other = c.otherRevenue || 0;
      const total = fee + ad + other;
      const feePaid = si >= feeIdx ? fee : 0;
      const adPaid = c.status === "AD着金済み" ? ad : 0;
      const otherPaid = si >= otherIdx ? other : 0;
      const paid = feePaid + adPaid + otherPaid;
      expected += total;
      collected += paid;
      return { name: c.name, staff: c.assigned, fee, ad, other, total, paid, status: c.status, feePaid: si >= feeIdx, adPaid: c.status === "AD着金済み", otherPaid: si >= otherIdx };
    });
    return {
      month: cohort.month,
      expected,
      collected,
      uncollected: expected - collected,
      rate: expected > 0 ? Math.round((collected / expected) * 1000) / 10 : 0,
      count: cohort.customers.length,
      details,
    };
  });

  const totalExpected = cohorts.reduce((s, c) => s + c.expected, 0);
  const totalCollected = cohorts.reduce((s, c) => s + c.collected, 0);
  return { targetMonth, totalExpected, totalCollected, totalUncollected: totalExpected - totalCollected, rate: totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 1000) / 10 : 0, cohorts };
}

// APIのURL
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://night-housing-dashboard.onrender.com";

// APIデータ → フロントエンド形式に変換
function mapApiCustomer(c, index) {
  // ステータス変更履歴からleadTimesを生成
  let leadTimes = [];
  try {
    const history = JSON.parse(c.status_history || "[]");
    for (let i = 0; i < history.length; i++) {
      const h = history[i];
      const prevTime = i === 0
        ? new Date(`${c.created_at || c.follow_date}`)
        : new Date(history[i - 1].at);
      const currTime = new Date(h.at);
      const hours = Math.round((currTime - prevTime) / 3600000);
      leadTimes.push({ from: h.from, to: h.to, hours: Math.max(hours, 0) });
    }
  } catch (e) { leadTimes = []; }

  // 契約日: APIから取得 → status_historyから逆算 → feePaymentDate → addedDateの順でフォールバック
  let contractDate = c.contract_date || "";
  // 不正値チェック（日付形式でなければクリア）
  if (contractDate && !/^\d{4}[\/\-]\d{2}[\/\-]\d{2}/.test(contractDate)) contractDate = "";
  if (!contractDate) {
    const CS = ["審査通過済み（契約準備中）","仲介手数料着金済み","その他売上着金済み","契約済み","AD着金済み"];
    try {
      const history = JSON.parse(c.status_history || "[]");
      const entry = history.find(h => CS.includes(h.to));
      if (entry && entry.at) {
        const m = entry.at.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
        if (m) contractDate = `${m[1]}/${m[2]}/${m[3]}`;
      }
    } catch(e) {}
  }
  // 契約済みなのにcontractDateがない場合、着金日or友達追加日をフォールバック
  if (!contractDate && CONTRACTED_STATUSES.has(c.status || "")) {
    contractDate = c.fee_payment_date || c.follow_date || "";
  }

  return {
    id: c.line_user_id || index + 1,
    name: c.display_name || "",
    caseName: c.deal_name || "",
    assigned: c.staff || "",
    status: c.status || "未対応",
    commission: Number(String(c.fee || "").replace(/[¥￥,、]/g, "")) || 0,
    ad: Number(String(c.ad || "").replace(/[¥￥,、]/g, "")) || 0,
    otherRevenue: Number(String(c.other_revenue || "").replace(/[¥￥,、]/g, "")) || 0,
    // 注意喚起判定用の生値（空文字 = 未入力）
    feeRaw: c.fee || "",
    adRaw: c.ad || "",
    otherRevenueRaw: c.other_revenue || "",
    paymentDate: c.fee_payment_date || c.payment_date || "",
    feePaymentDate: c.fee_payment_date || "",
    adPaymentDate: c.ad_payment_date || "",
    otherRevenuePaymentDate: c.other_revenue_payment_date || "",
    feeReceivedDate: c.fee_received_date || "",
    adReceivedDate: c.ad_received_date || "",
    otherRevenueReceivedDate: c.other_revenue_received_date || "",
    applicationCount: c.application_count || "",
    memo: c.first_message || "",
    addedDate: c.follow_date || "",
    contractDate,
    lineUserId: c.line_user_id || "",
    avgReplyMin: Number(c.avg_reply_min) || 0,
    statusHistory: c.status_history || "[]",
    leadTimes,
    moveInTiming: c.move_in_timing || "",
    desiredArea: c.desired_area || "",
    desiredRent: c.desired_rent || "",
    initialBudget: c.initial_budget || "",
    desiredLayout: c.desired_layout || "",
    desiredStation: c.desired_station || "",
    walkMinutes: c.walk_minutes || "",
    mustConditions: c.must_conditions || "",
    numResidents: c.num_residents || "",
    annualIncome: c.annual_income || "",
    idDocument: c.id_document || "",
    repaymentStatus: c.repayment_status || "",
    contactMethod: c.contact_method || "",
    guaranteeCompany: c.guarantee_company || "",
    arrearsRent: c.arrears_rent || "",
    arrearsCard: c.arrears_card || "",
    propertyForm: c.property_form || "",
    initialSurvey: c.initial_survey || "",
    realName: c.real_name || "",
  };
}

// --- 汎用コンポーネント ---
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, backdropFilter:"blur(4px)" }}>
      <div style={{ background:DS.card, borderRadius:DS.radius, padding:"28px", width:"92%", maxWidth:520, border:`1px solid ${DS.border}`, boxShadow:"0 20px 60px rgba(0,0,0,0.15)", maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem" }}>
          <div style={{ fontSize:16, fontWeight:700, color:DS.text1, letterSpacing:"-0.01em" }}>{title}</div>
          <button onClick={onClose} style={{ background:DS.hover, border:"none", cursor:"pointer", color:DS.text2, lineHeight:1, width:32, height:32, borderRadius:DS.radiusSm, display:"flex", alignItems:"center", justifyContent:"center", transition:"background 0.2s" }} onMouseEnter={e=>e.currentTarget.style.background=DS.border} onMouseLeave={e=>e.currentTarget.style.background=DS.hover}><X size={16} strokeWidth={1.5}/></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:11, fontWeight:600, color:DS.text2, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:6 }}>{label}</div>
      {children}
    </div>
  );
}

function FInput({ value, onChange, placeholder, type="text" }) {
  return <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder||""} style={{ width:"100%", fontSize:13, padding:"10px 12px", borderRadius:DS.radiusSm, border:`1.5px solid ${DS.border}`, background:"#fff", color:DS.text1, boxSizing:"border-box", outline:"none", transition:"border-color 0.15s" }} onFocus={e=>e.target.style.borderColor=DS.teal} onBlur={e=>e.target.style.borderColor=DS.border}/>;
}

function FSelect({ value, onChange, options }) {
  return (
    <select value={value} onChange={e=>onChange(e.target.value)} style={{ width:"100%", fontSize:13, padding:"10px 12px", borderRadius:DS.radiusSm, border:`1.5px solid ${DS.border}`, background:"#fff", color:DS.text1 }}>
      {options.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Btn({ onClick, children, variant="default" }) {
  const styles = {
    default: { background:"#fff", color:DS.text1, border:`1px solid ${DS.border}` },
    primary: { background:DS.teal, color:"#fff", border:"none" },
    danger:  { background:"#FFF1F2", color:DS.rose, border:`1px solid #FECDD3` },
  };
  return <button onClick={onClick} style={{ ...styles[variant], fontSize:13, padding:"9px 18px", borderRadius:DS.radiusSm, cursor:"pointer", fontWeight:500, letterSpacing:"0.01em", transition:"all 0.2s" }}>{children}</button>;
}

function TrendSparkline({ data, color }) {
  if (!data || data.length < 2) return null;
  const w=80, h=32, mn=Math.min(...data)-2, mx=Math.max(...data)+2;
  const pts = data.map((v,i)=>{ const x=(i/(data.length-1))*w, y=h-((v-mn)/(mx-mn))*h; return `${x.toFixed(1)},${y.toFixed(1)}`; }).join(" ");
  return (
    <svg width={w} height={h} style={{ overflow:"visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
      {data.map((v,i)=>{ const x=(i/(data.length-1))*w, y=h-((v-mn)/(mx-mn))*h; return <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r="2.5" fill={color}/>; })}
    </svg>
  );
}

function ContractRateBar({ value:rawValue }) {
  const value = rawValue || 0;
  const color = value>=35?DS.emerald:value>=25?DS.indigo:DS.rose;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
      <div style={{ flex:1, height:8, background:"#E2E8F0", borderRadius:4, overflow:"hidden" }}>
        <div style={{ width:`${Math.min(Math.round((value/50)*100),100)}%`, height:"100%", background:color, borderRadius:4, transition:"all 0.5s" }}/>
      </div>
      <span style={{ fontSize:20, fontWeight:500, minWidth:52, color, fontVariantNumeric:"tabular-nums" }}>{value.toFixed(1)}%</span>
    </div>
  );
}

// --- 顧客モーダル ---
function CustomerModal({ customer, onSave, onDelete, onClose }) {
  const isNew = !customer?.id;
  const [form, setForm] = useState({ name:"", caseName:"", assigned:STAFF[0], status:"未対応", commission:"", ad:"", paymentDate:"", feePaymentDate:"", adPaymentDate:"", otherRevenuePaymentDate:"", memo:"", ...(customer||{}) });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const estimate = (Number(form.commission)||0)+(Number(form.ad)||0)+(Number(form.otherRevenue)||0);
  return (
    <Modal title={isNew?"顧客を追加":"顧客情報を編集"} onClose={onClose}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
        <Field label="顧客名（表示名）"><FInput value={form.name} onChange={v=>set("name",v)} placeholder="例: 田中 太郎"/></Field>
        <Field label="案件名"><FInput value={form.caseName} onChange={v=>set("caseName",v)} placeholder="例: 代官山マンション"/></Field>
        <Field label="担当者"><FSelect value={form.assigned} onChange={v=>set("assigned",v)} options={STAFF}/></Field>
        <Field label="進捗ステータス"><FSelect value={form.status} onChange={v=>set("status",v)} options={STATUSES}/></Field>
        <Field label="仲介手数料（円）"><FInput value={form.commission} onChange={v=>set("commission",v)} placeholder="例: 150000"/></Field>
        <Field label="AD（円）"><FInput value={form.ad} onChange={v=>set("ad",v)} placeholder="例: 50000"/></Field>
        <Field label="その他売上（円）"><FInput value={form.otherRevenue} onChange={v=>set("otherRevenue",v)} placeholder="例: 30000"/></Field>
      </div>
      <Field label="仲介手数料着金予定日"><FInput type="date" value={form.feePaymentDate||form.paymentDate} onChange={v=>{set("feePaymentDate",v);set("paymentDate",v);}}/></Field>
      <Field label="AD着金予定日"><FInput type="date" value={form.adPaymentDate} onChange={v=>set("adPaymentDate",v)}/></Field>
      <Field label="その他売上着金予定日"><FInput type="date" value={form.otherRevenuePaymentDate} onChange={v=>set("otherRevenuePaymentDate",v)}/></Field>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"0 16px" }}>
        <Field label="入居時期"><div style={{ fontSize:13, padding:"8px 12px", background:DS.pageBg, borderRadius:6, color:DS.text1, minHeight:36 }}>{form.moveInTiming || "−"}</div></Field>
        <Field label="希望エリア"><div style={{ fontSize:13, padding:"8px 12px", background:DS.pageBg, borderRadius:6, color:DS.text1, minHeight:36 }}>{form.desiredArea || "−"}</div></Field>
        <Field label="希望家賃"><div style={{ fontSize:13, padding:"8px 12px", background:DS.pageBg, borderRadius:6, color:DS.text1, minHeight:36 }}>{form.desiredRent || "−"}</div></Field>
      </div>
      {!isNew && (
        <div style={{ display:"flex", gap:12, marginBottom:12 }}>
          <div style={{ fontSize:12, color:DS.text2 }}>初回アンケート: {form.initialSurvey ? <span style={{ color:DS.emerald, fontWeight:500 }}>回答済</span> : <span style={{ color:DS.rose }}>未回答</span>}</div>
          <div style={{ fontSize:12, color:DS.text2 }}>希望物件フォーム: {form.propertyForm ? <span style={{ color:DS.emerald, fontWeight:500 }}>回答済</span> : <span style={{ color:DS.rose }}>未回答</span>}</div>
        </div>
      )}
      <Field label="メモ"><FInput value={form.memo} onChange={v=>set("memo",v)} placeholder="自由記入"/></Field>
      <div style={{ background:DS.beige, borderRadius:DS.radiusSm, padding:"10px 14px", marginBottom:16, display:"flex", justifyContent:"space-between" }}>
        <span style={{ fontSize:12, color:DS.text2 }}>契約見込み金（仲介手数料＋AD＋その他）</span>
        <span style={{ fontSize:16, fontWeight:500 }}>{estimate.toLocaleString()}円</span>
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", gap:8 }}>
        <div>{!isNew && <Btn onClick={()=>onDelete(customer.id)} variant="danger">削除</Btn>}</div>
        <div style={{ display:"flex", gap:8 }}>
          <Btn onClick={onClose}>キャンセル</Btn>
          <Btn onClick={()=>onSave({...form, commission:Number(form.commission)||0, ad:Number(form.ad)||0, otherRevenue:Number(form.otherRevenue)||0, id:customer?.id||Date.now()})} variant="primary">{isNew?"追加":"保存"}</Btn>
        </div>
      </div>
    </Modal>
  );
}

// --- メイン ---
export default function Dashboard() {
  const [tab, setTab] = useState("overview");
  const [team, setTeam] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(`${CURRENT_YEAR}/${String(CURRENT_MONTH).padStart(2,"0")}`);
  const [apiLoading, setApiLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  // 編集中フラグ: 編集後しばらくポーリングをスキップ
  const lastEditTimeRef = useRef(0);
  const savingCountRef = useRef(0); // 保存中のAPI呼び出し数

  // 保険フィルター: 名前空欄 + 追加から24時間経過 → ゴースト行として除外
  // 名前空欄 + 24時間以内 → CSV同期待ちの可能性があるので表示
  const filterGhosts = (list) => {
    const now = Date.now();
    const H24 = 24 * 60 * 60 * 1000;
    return list.filter(c => {
      if (c.name && String(c.name).trim() !== "") return true; // 名前あり → 表示
      // 名前空欄: addedDate から24時間以内なら表示
      const d = c.addedDate || "";
      if (!d) return false; // 追加日不明 + 名前空欄 → 非表示
      const added = new Date(String(d).replace(/\//g, "-") + "T00:00:00+09:00").getTime();
      return !isNaN(added) && (now - added) < H24;
    });
  };

  // サーバーからデータ取得して全stateを更新
  const applyServerData = (json) => {
    if (json.success && Array.isArray(json.data)) {
      const mapped = filterGhosts(json.data.map(mapApiCustomer));
      setCustomers(mapped);
      setTeam(buildTeamFromCustomers(mapped));
      setApiError(null);
    }
  };

  // APIからデータ取得
  const fetchCustomers = async (force) => {
    // 保存中 or 編集直後10秒はスキップ（forceの場合は除く）
    if (!force && (savingCountRef.current > 0 || Date.now() - lastEditTimeRef.current < 10000)) {
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/customers`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const json = await res.json();
      applyServerData(json);
    } catch (err) {
      console.error("データ取得エラー:", err.message);
      setApiError(err.message);
    } finally {
      setApiLoading(false);
    }
  };

  // スコアデータ取得
  const fetchScores = async () => {
    try {
      const [scoresRes, overdueRes, historyRes, goalsRes] = await Promise.all([
        fetch(`${API_URL}/api/scores`).then(r=>r.json()),
        fetch(`${API_URL}/api/overdue`).then(r=>r.json()),
        fetch(`${API_URL}/api/scores/history`).then(r=>r.json()),
        fetch(`${API_URL}/api/goals`).then(r=>r.json()),
      ]);
      if (scoresRes.success) setStaffScores(scoresRes.data);
      if (overdueRes.success) setOverdueData(overdueRes.data);
      if (historyRes.success) setScoreHistory(historyRes.data);
      if (goalsRes.success) setGoals(goalsRes.data);
    } catch (err) {
      console.error("スコアデータ取得エラー:", err.message);
    }
  };

  // 個人目標を保存
  const saveGoal = async (staff, month, salesTarget, contractTarget) => {
    setGoalSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/goals/${encodeURIComponent(staff)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, salesTarget, contractTarget }),
      });
      const data = await res.json();
      if (data.success) {
        // ローカルstateを更新
        setGoals(prev => {
          const idx = prev.findIndex(g => g.staff === staff && g.month === month);
          if (idx >= 0) { const next = [...prev]; next[idx] = data.data; return next; }
          return [...prev, data.data];
        });
        setGoalEditing(null);
        showToast("目標を保存しました");
      }
    } catch (err) {
      console.error("目標保存エラー:", err.message);
      showToast("保存に失敗しました");
    } finally {
      setGoalSaving(false);
    }
  };

  // [TDZ FIX] 売上3軸関連の関数とuseEffectは、homePeriod/revenuePeriod等のuseState宣言より後ろに移動した。
  // 旧位置(2be6552で導入)では deps array が useState 宣言前に評価されTDZエラー(Cannot access X before initialization)が発生していた。

  // 初回ロード + 60秒ごとに自動更新
  useEffect(() => {
    fetchCustomers(true);
    fetchScores();
    const interval = setInterval(() => fetchCustomers(false), 60000);
    const scoreInterval = setInterval(fetchScores, 120000);
    return () => { clearInterval(interval); clearInterval(scoreInterval); };
  }, []);

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sidebarOpen");
      return stored === null ? true : stored === "true";
    }
    return true;
  });
  const toggleSidebar = () => {
    setSidebarOpen(prev => {
      const next = !prev;
      localStorage.setItem("sidebarOpen", String(next));
      return next;
    });
  };
  const sidebarW = sidebarOpen ? 240 : 64;

  const [selectedMember, setSelectedMember] = useState(null);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState("全員");
  const [filterStaff, setFilterStaff] = useState("全員");
  const [filterStatus, setFilterStatus] = useState("全て");
  const [searchText, setSearchText] = useState("");
  const [aiAdvice, setAiAdvice] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [staffScores, setStaffScores] = useState(null);
  const [overdueData, setOverdueData] = useState(null);
  const [scoreHistory, setScoreHistory] = useState([]);
  const chartRef = useRef(null);
  const contractChartRef = useRef(null);
  const memberChartRef = useRef(null);
  const pipelineChartRef = useRef(null);
  const scatterChartRef = useRef(null);
  const [chartLoaded, setChartLoaded] = useState(false);

  // KPI/KGI 目標値
  const [kpiTargets, setKpiTargets] = useState({ replySpeed:20, teamRate:40, personalRate:35, replyRate:90 });
  const [kgiTargets, setKgiTargets] = useState({ contracts:10, revenue:1200, nyukin:800 });
  const [editingKpi, setEditingKpi] = useState(false);

  // PDCAメモ（担当者名→メモ）
  const [pdcaNotes, setPdcaNotes] = useState({
    "澤田":     { plan:"", do:"", check:"", act:"" },
    "中尾":     { plan:"", do:"", check:"", act:"" },
    "松井":     { plan:"", do:"", check:"", act:"" },
    "茂木":     { plan:"", do:"", check:"", act:"" },
    "田中和弘": { plan:"", do:"", check:"", act:"" },
    "長田":     { plan:"", do:"", check:"", act:"" },
    "太森":     { plan:"", do:"", check:"", act:"" },
    "小川":     { plan:"", do:"", check:"", act:"" },
  });
  const [goals, setGoals] = useState([]);
  const [goalEditing, setGoalEditing] = useState(null); // { staff, month, salesTarget, contractTarget }
  const [goalSaving, setGoalSaving] = useState(false);
  const [summaryMonth, setSummaryMonth] = useState(`${CURRENT_YEAR}/${String(CURRENT_MONTH).padStart(2,"0")}`);
  // 全体目標（チーム全体の月間売上目標・契約目標）
  const [teamGoal, setTeamGoal] = useState({ salesTarget: 0, contractTarget: 0 });
  const [teamGoalEditing, setTeamGoalEditing] = useState(false);
  const [teamGoalDraft, setTeamGoalDraft] = useState({ salesTarget: "", contractTarget: "" });
  const [homePeriod, setHomePeriod] = useState("fiscal"); // fiscal, thisMonth, lastMonth, custom
  const [revenueFiscal, setRevenueFiscal] = useState(false); // 売上タブ用 今期トグル（OFF時は月選択に連動）
  const [sales3Axis, setSales3Axis] = useState(null); // { prospect, contract_based, received_based }
  const [sales3AxisLoading, setSales3AxisLoading] = useState(false);
  const [homeSales3Axis, setHomeSales3Axis] = useState(null);
  const [expandedTeamMember, setExpandedTeamMember] = useState(null); // accordion in team tab
  const [summaryRange, setSummaryRange] = useState(3); // 3, 6, or 12 months
  const [customerMonth, setCustomerMonth] = useState(`${CURRENT_YEAR}/${String(CURRENT_MONTH).padStart(2,"0")}`);
  // 顧客管理タブ: デフォルトは新着20人表示、切り替えで全件表示
  const [showAllCustomers, setShowAllCustomers] = useState(false);
  // コホート分析の月選択（ヘッダー月とは独立）
  const [cohortMonth, setCohortMonth] = useState(`${CURRENT_YEAR}/${String(CURRENT_MONTH).padStart(2,"0")}`);
  const [expandedMonths, setExpandedMonths] = useState({"3月":true});
  const toggleMonth = (month) => setExpandedMonths(prev=>({...prev,[month]:!prev[month]}));

  // [TDZ FIX] 売上3軸の fetch + useEffect は revenueMonth useState (line~1051) より後ろに配置

  // ホーム用の3軸売上: homePeriodで取得（全担当者）
  useEffect(() => {
    const fetchHome3Axis = async () => {
      try {
        const params = new URLSearchParams({ period: homePeriod });
        const res = await fetch(`${API_URL}/api/sales-3axis?${params.toString()}`);
        const json = await res.json();
        if (json.success) setHomeSales3Axis(json);
      } catch (err) {
        console.error("ホーム3軸売上取得エラー:", err.message);
      }
    };
    fetchHome3Axis();
  }, [homePeriod]);

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(null), 2500); };

  useEffect(()=>{
    const s=document.createElement("script");
    s.src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
    s.onload=()=>setChartLoaded(true);
    document.head.appendChild(s);
  },[]);

  // 月リストを生成（2026年1月〜当月まで + データがある月）
  const availableMonths = (() => {
    const dataMonths = new Set(customers.map(c => {
      const d = c.addedDate || "";
      return d ? d.substring(0, 7).replace("-", "/") : "";
    }).filter(Boolean));
    // 2026年1月〜当月まで固定で含める
    const months = new Set(dataMonths);
    for (let m = 1; m <= CURRENT_MONTH; m++) {
      months.add(`${CURRENT_YEAR}/${String(m).padStart(2, "0")}`);
    }
    return [...months].sort();
  })();

  // 月フィルター: 選択月の顧客のみ抽出
  const mc = customers.filter(c => {
    const d = c.addedDate || "";
    const m = d ? d.substring(0, 7).replace("-", "/") : "";
    return m === selectedMonth;
  });

  // 契約月ベースで契約数をカウント（1顧客=1契約、contractDateの月で集計）
  const contractedInMonth = (month, pool) => {
    if (!pool) pool = customers;
    return pool.filter(c => {
      if (!CONTRACTED_STATUSES.has(c.status)) return false;
      const cd = c.contractDate || "";
      const cm = cd ? cd.substring(0, 7).replace("-", "/") : "";
      return cm === month;
    }).length;
  };

  // 着金データ（月フィルター済み顧客から派生）
  const payments = buildPaymentsFromCustomers(mc);
  const received = payments.filter(p=>p.status==="着金").reduce((s,p)=>s+p.amount,0);
  const pending  = payments.filter(p=>p.status==="未着金").reduce((s,p)=>s+p.amount,0);
  const total    = received+pending;
  const mcTeam = buildTeamFromCustomers(mc);
  const avgRate  = mcTeam.length>0 ? mcTeam.reduce((s,m)=>s+(m.monthlyRate[m.monthlyRate.length-1]||0),0)/mcTeam.length : 0;
  const selectedM = team.find(t=>t.name===selectedMember);

  // 売上ドーナツチャート
  useEffect(()=>{
    if(!chartLoaded||tab!=="overview"||!chartRef.current) return;
    const C=window.Chart;
    const chart=new C(chartRef.current.getContext("2d"),{
      type:"doughnut",
      data:{
        labels:["着金済み","未着金"],
        datasets:[{ data:[received, pending], backgroundColor:[DS.emerald,"#B5D4F4"], borderWidth:0, hoverOffset:4 }]
      },
      options:{
        responsive:true, maintainAspectRatio:false, cutout:"72%",
        plugins:{
          legend:{ display:false },
          tooltip:{ callbacks:{ label:c=>`${c.label}: ${c.parsed.toLocaleString()}円` } }
        }
      }
    });
    return ()=>chart.destroy();
  },[chartLoaded, tab, received, pending]);

  // 契約率折れ線チャート（月次推移）
  useEffect(()=>{
    if(!chartLoaded||tab!=="overview"||!contractChartRef.current) return;
    const C=window.Chart;
    const chart=new C(contractChartRef.current.getContext("2d"),{
      type:"line",
      data:{
        labels:["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"],
        datasets:[{
          label:"契約率",
          data:(() => {
            const now = new Date();
            const currentMonth = now.getMonth();
            const rate = mc.length > 0
              ? (mc.filter(c=>CONTRACTED_STATUSES.has(c.status)).length / mc.length) * 100
              : 0;
            const arr = Array(12).fill(null);
            arr[currentMonth] = Math.round(rate * 10) / 10;
            return arr;
          })(),
          borderColor:DS.emerald, backgroundColor:"#D1FAE5",
          tension:0.4, fill:true, pointRadius:5, pointBackgroundColor:DS.emerald,
          spanGaps:false
        }]
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{display:false}, tooltip:{callbacks:{label:c=>c.parsed.y!==null?`${c.parsed.y}%`:"未集計"}} },
        scales:{
          x:{ grid:{display:false}, ticks:{font:{size:11}} },
          y:{ min:0, max:100, ticks:{stepSize:5, callback:v=>`${v}%`}, grid:{color:"#E2E8F0"} }
        }
      }
    });
    return ()=>chart.destroy();
  },[chartLoaded, tab, mc]);

  // パイプライン ドーナツチャート
  useEffect(()=>{
    if(!chartLoaded||tab!=="pipeline"||!pipelineChartRef.current) return;
    const C=window.Chart;
    const counts=STATUSES.map(s=>mc.filter(c=>c.status===s).length);
    const colors=STATUSES.map(s=>STATUS_STYLE[s].text);
    const chart=new C(pipelineChartRef.current.getContext("2d"),{
      type:"doughnut",
      data:{ labels:STATUSES, datasets:[{ data:counts, backgroundColor:colors.map(c=>c+"CC"), borderWidth:0, hoverOffset:4 }] },
      options:{ responsive:true, maintainAspectRatio:false, cutout:"68%", plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:ctx=>`${ctx.label}: ${ctx.parsed}件` } } } }
    });
    return ()=>chart.destroy();
  },[chartLoaded,tab,mc]);

  // 担当者詳細チャート
  useEffect(()=>{
    if(!chartLoaded||tab!=="team"||!selectedMember||!memberChartRef.current) return;
    const C=window.Chart; const m=team.find(t=>t.name===selectedMember); if(!m) return;
    // 95%以上は100%として表示（稀な端数やノイズを丸める）
    const cappedRates = m.monthlyRate.map(v => (typeof v === "number" && v >= 95 ? 100 : v));
    const chart=new C(memberChartRef.current.getContext("2d"),{
      type:"line",
      data:{ labels:MONTHS, datasets:[{ data:cappedRates, borderColor:m.color, backgroundColor:m.bg+"88", tension:0.4, fill:true, pointRadius:6, pointBackgroundColor:m.color }] },
      options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}, tooltip:{callbacks:{label:c=>c.parsed.y!==null?`${c.parsed.y}%`:"−"}}}, scales:{ x:{grid:{display:false}}, y:{min:0,max:100, ticks:{stepSize:10, callback:v=>`${v}%`}, grid:{color:"#E2E8F0"}} } }
    });
    return ()=>chart.destroy();
  },[chartLoaded,tab,selectedMember,team]);

  // 返信スピード×リードタイム 散布図
  useEffect(()=>{
    if(!chartLoaded||tab!=="team"||!selectedMember||!scatterChartRef.current) return;
    const C=window.Chart;
    // チーム全員のデータポイントを生成
    const datasets = team.map(m=>{
      const myCustomers = mc.filter(c=>c.assigned===m.name&&(c.leadTimes||[]).length>0);
      const points = myCustomers.map(c=>({
        x: m.avgReply,
        y: (c.leadTimes||[]).reduce((s,l)=>s+l.hours,0),
        name: c.name,
      }));
      const isSelected = m.name===selectedMember;
      return {
        label: m.name,
        data: points,
        backgroundColor: isSelected ? m.color : m.color+"55",
        pointRadius: isSelected ? 8 : 5,
        pointHoverRadius: 10,
      };
    });
    const chart=new C(scatterChartRef.current.getContext("2d"),{
      type:"scatter",
      data:{ datasets },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{
          legend:{ display:true, position:"bottom", labels:{ boxWidth:10, font:{size:11} } },
          tooltip:{ callbacks:{ label:ctx=>`${ctx.dataset.label}: 返信${ctx.parsed.x}分 / リードタイム${ctx.parsed.y}h` } }
        },
        scales:{
          x:{ title:{ display:true, text:"返信スピード（分）", font:{size:11} }, grid:{color:"#E2E8F0"}, min:0 },
          y:{ title:{ display:true, text:"リードタイム（時間）", font:{size:11} }, grid:{color:"#E2E8F0"}, min:0 }
        }
      }
    });
    return ()=>chart.destroy();
  },[chartLoaded,tab,selectedMember,team,mc]);

  // 顧客CRUD
  const saveCustomer = (c) => {
    if(customers.find(x=>x.id===c.id)) { setCustomers(prev=>prev.map(x=>x.id===c.id?c:x)); showToast("顧客情報を更新しました"); }
    else { setCustomers(prev=>[...prev,c]); showToast("顧客を追加しました"); }
    setModal(null);
  };
  const deleteCustomer = (id) => { setCustomers(prev=>prev.filter(c=>c.id!==id)); showToast("顧客を削除しました"); setModal(null); };
  const updateField = (id,field,value) => {
    // ローカルstate即座に更新
    setCustomers(prev=>prev.map(c=>c.id===id?{...c,[field]:value}:c));
    lastEditTimeRef.current = Date.now();
    const fieldMap = { status:"status", assigned:"staff", caseName:"deal_name", commission:"fee", ad:"ad", otherRevenue:"other_revenue", paymentDate:"fee_payment_date", feePaymentDate:"fee_payment_date", adPaymentDate:"ad_payment_date", otherRevenuePaymentDate:"other_revenue_payment_date", feeReceivedDate:"fee_received_date", adReceivedDate:"ad_received_date", otherRevenueReceivedDate:"other_revenue_received_date" };
    const apiField = fieldMap[field];
    if(apiField) {
      const customer = customers.find(c=>c.id===id);
      const lineUserId = customer?.lineUserId || customer?.id;
      if(lineUserId) {
        savingCountRef.current++;
        fetch(`${API_URL}/api/customers/${encodeURIComponent(lineUserId)}`, {
          method:"PUT",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({[apiField]:String(value)})
        }).then(r=>r.json()).then(j=>{
          savingCountRef.current = Math.max(0, savingCountRef.current - 1);
          if(j.success) {
            if (j.lstep_sync === false && j.lstep_errors?.length > 0) {
              showToast("保存完了（Lステップ同期失敗）");
            } else {
              showToast(j.lstep_sync ? "保存+Lステップ同期完了" : "保存完了");
            }
            // 保存成功後、サーバーから最新データを再取得
            setTimeout(() => fetchCustomers(true), 1500);
          } else {
            showToast("保存エラー");
          }
        }).catch(e=>{
          savingCountRef.current = Math.max(0, savingCountRef.current - 1);
          console.error("Update failed:",e);
          showToast("保存エラー");
        });
      }
    }
  };
  const togglePayment = (id) => {
    const item = payments.find(p=>p.id===id);
    if(!item || !item.customerId) return;
    if(item.status==="着金") {
      const prevStatus = UNPAID_STATUS_MAP[item.type] || "審査通過済み（契約準備中）";
      updateField(item.customerId, "status", prevStatus);
      showToast("未着金に変更しました");
    } else {
      const paidStatus = PAID_STATUS_MAP[item.type];
      if(paidStatus) {
        updateField(item.customerId, "status", paidStatus);
        showToast("着金に変更しました");
      }
    }
  };

  // フィルター済み顧客（グローバル担当者フィルター + 月フィルター + ローカルフィルター + 検索）
  const filteredCustomers = mc.filter(c=>{
    if(selectedStaff!=="全員" && c.assigned!==selectedStaff) return false;
    if(filterStaff!=="全員" && c.assigned!==filterStaff) return false;
    if(filterStatus!=="全て" && c.status!==filterStatus) return false;
    if(searchText && !c.name.includes(searchText) && !(c.caseName||"").includes(searchText)) return false;
    return true;
  }).sort((a,b)=>(b.addedDate||"").localeCompare(a.addedDate||""));

  // 顧客管理タブ用: 月フィルターを除いた全顧客ベース
  //   - 担当者フィルター(selectedStaff) + ステータスフィルター + 検索は適用
  //   - 友達追加日の新しい順にソート
  //   - showAllCustomers=false なら新着20件に絞る
  const customerTabAll = customers.filter(c=>{
    if(selectedStaff!=="全員" && c.assigned!==selectedStaff) return false;
    if(filterStatus!=="全て" && c.status!==filterStatus) return false;
    if(searchText && !c.name.includes(searchText) && !(c.caseName||"").includes(searchText)) return false;
    return true;
  }).sort((a,b)=>(b.addedDate||"").localeCompare(a.addedDate||""));
  const customerTabDisplay = showAllCustomers ? customerTabAll : customerTabAll.slice(0, 20);

  // 売上管理データ（グローバル担当者フィルター適用）
  const revenueCustomers = selectedStaff === "全員" ? customers : customers.filter(c => c.assigned === selectedStaff);
  const revenueItems = buildRevenueFromCustomers(revenueCustomers);

  const [revenueView, setRevenueView] = useState("monthly"); // "monthly" | "annual"
  const [revenueMonth, setRevenueMonth] = useState(selectedMonth);
  const [expandedCohort, setExpandedCohort] = useState(null);

  // ヘッダー月タブ変更時に他タブの月も同期
  useEffect(() => { setRevenueMonth(selectedMonth); setSummaryMonth(selectedMonth); }, [selectedMonth]);

  // 売上3軸データ取得 — revenueMonth useState の後ろに配置(TDZ回避)
  const fetchSales3Axis = async () => {
    setSales3AxisLoading(true);
    try {
      const params = new URLSearchParams();
      if (revenueFiscal) {
        params.set("period", "fiscal");
      } else {
        // 月選択(YYYY/MM)を custom range に変換
        const [yStr, mStr] = (revenueMonth || "").split("/");
        const y = Number(yStr), m = Number(mStr);
        if (y && m) {
          const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
          params.set("period", "custom");
          params.set("start", `${yStr}-${mStr}-01`);
          params.set("end", `${yStr}-${mStr}-${String(lastDay).padStart(2, "0")}`);
        } else {
          params.set("period", "thisMonth");
        }
      }
      if (selectedStaff && selectedStaff !== "全員") params.set("staff", selectedStaff);
      const res = await fetch(`${API_URL}/api/sales-3axis?${params.toString()}`);
      const json = await res.json();
      if (json.success) setSales3Axis(json);
    } catch (err) {
      console.error("売上3軸データ取得エラー:", err.message);
    } finally {
      setSales3AxisLoading(false);
    }
  };

  // 売上3軸: 月選択/今期トグル/担当者変更時に再取得
  useEffect(() => {
    fetchSales3Axis();
  }, [revenueMonth, revenueFiscal, selectedStaff]);

  // 売上管理フィールド→APIフィールドのマッピング（種別ごとに着金予定日が異なる）
  const getRevenueDateField = (type) => {
    if(type==="仲介手数料") return "fee_payment_date";
    if(type==="AD") return "ad_payment_date";
    if(type==="その他売上") return "other_revenue_payment_date";
    return "fee_payment_date";
  };
  // APIフィールド→顧客stateフィールドの逆マッピング
  const apiToCustomerField = { fee_payment_date:"feePaymentDate", ad_payment_date:"adPaymentDate", other_revenue_payment_date:"otherRevenuePaymentDate", deal_name:"caseName", staff:"assigned" };
  // 売上管理の変更をAPIに保存 & customers stateも同期
  const saveRevenueField = (revenueItem, apiField, value) => {
    if(!revenueItem?.lineUserId) return;
    lastEditTimeRef.current = Date.now();
    const custField = apiToCustomerField[apiField];
    if(custField) {
      setCustomers(prev=>prev.map(c=>{
        const cId = c.lineUserId || c.id;
        return cId===revenueItem.lineUserId ? {...c,[custField]:value} : c;
      }));
    }
    savingCountRef.current++;
    fetch(`${API_URL}/api/customers/${encodeURIComponent(revenueItem.lineUserId)}`, {
      method:"PUT",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({[apiField]:String(value)})
    }).then(r=>r.json()).then(j=>{
      savingCountRef.current = Math.max(0, savingCountRef.current - 1);
      if(j.success) {
        showToast("保存完了");
        setTimeout(() => fetchCustomers(true), 1500);
      } else showToast("保存エラー");
    }).catch(()=>{
      savingCountRef.current = Math.max(0, savingCountRef.current - 1);
      showToast("保存エラー");
    });
  };
  // パイプラインステータスの着金マッピング
  const PAID_STATUS_MAP = {
    "仲介手数料": "仲介手数料着金済み",
    "AD": "AD着金済み",
    "その他売上": "その他売上着金済み",
  };
  const UNPAID_STATUS_MAP = {
    "仲介手数料": "審査通過済み（契約準備中）",
    "AD": "契約済み",
    "その他売上": "仲介手数料着金済み",
  };
  const toggleRevenueStatus = (id) => {
    const item = revenueItems.find(r=>r.id===id);
    if(!item || !item.customerId) return;
    if(item.status==="入金済") {
      // 入金済→未収: パイプラインを1段階戻す
      const prevStatus = UNPAID_STATUS_MAP[item.type] || "審査通過済み（契約準備中）";
      updateField(item.customerId, "status", prevStatus);
      showToast("未収に変更しました");
    } else {
      // 未収→入金済: パイプラインを着金済みに進める
      const paidStatus = PAID_STATUS_MAP[item.type];
      if(paidStatus) {
        updateField(item.customerId, "status", paidStatus);
        showToast("入金済に変更しました");
      }
    }
  };
  const updateRevenue = (id, field, value) => {
    const item = revenueItems.find(r=>r.id===id);
    if(!item) return;
    const fieldMap = { caseName:"deal_name", assigned:"staff", paidDate:getRevenueDateField(item.type) };
    const apiField = fieldMap[field];
    if(apiField) saveRevenueField(item, apiField, value);
  };
  const updateRevenuePaidDate = (id, value) => {
    const formatted = value ? value.replace(/-/g,"/") : "";
    const item = revenueItems.find(r=>r.id===id);
    if(!item) return;
    const dateField = getRevenueDateField(item.type);
    saveRevenueField(item, dateField, formatted);
    showToast("入金日を更新しました");
  };
  // 顧客単価を実データから計算
  const customersWithRevenue = mc.filter(c => (c.commission || 0) + (c.ad || 0) + (c.otherRevenue || 0) > 0);
  const currentAvg = customersWithRevenue.length > 0
    ? Math.round(customersWithRevenue.reduce((s, c) => s + (c.commission || 0) + (c.ad || 0) + (c.otherRevenue || 0), 0) / customersWithRevenue.length)
    : 0;
  const [selY, selM] = selectedMonth.split("/");
  const unitPriceHistory = [{ month:`${parseInt(selM)}月`, avg:currentAvg }];

  // グローバル担当者フィルター適用
  const staffFilteredCustomers = selectedStaff === "全員" ? customers : customers.filter(c => c.assigned === selectedStaff);
  const staffFilteredMc = selectedStaff === "全員" ? mc : mc.filter(c => c.assigned === selectedStaff);

  const tabs=[{id:"overview",label:"ホーム",Icon:Home},{id:"revenue",label:"売上管理",Icon:Wallet},{id:"team",label:"営業マン別",Icon:UserCheck},{id:"customers",label:"顧客管理",Icon:Users},{id:"pipeline",label:"パイプライン",Icon:GitBranch},{id:"summary",label:"月次サマリー",Icon:BarChart3}];

  return (
    <div style={{ fontFamily:"'Inter','Noto Sans JP',-apple-system,BlinkMacSystemFont,sans-serif", color:DS.text1, background:DS.pageBg, minHeight:"100vh", display:"flex" }}>

      {/* グローバルスタイル注入 */}
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 3px; }
        input:focus, select:focus, textarea:focus { outline: none; }
        button { font-family: inherit; }
        @media (max-width: 640px) {
          .kpi-grid-4 { grid-template-columns: 1fr 1fr !important; }
          .kpi-grid-3 { grid-template-columns: 1fr 1fr !important; }
          .grid-2 { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {toast && <div style={{ position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)", background:DS.card, color:DS.text1, fontSize:14, fontWeight:600, padding:"12px 24px", borderRadius:DS.radiusSm, zIndex:200, pointerEvents:"none", border:`1px solid ${DS.border}`, boxShadow:"0 4px 12px rgba(0,0,0,0.1)", letterSpacing:"0.01em" }}>{toast}</div>}
      {modal?.type==="customer" && <CustomerModal customer={modal.data} onSave={saveCustomer} onDelete={deleteCustomer} onClose={()=>setModal(null)}/>}

      {/* サイドバー */}
      <aside style={{ width:sidebarW, minHeight:"100vh", background:DS.sidebar, borderRight:`1px solid ${DS.border}`, position:"fixed", top:0, left:0, zIndex:50, display:"flex", flexDirection:"column", transition:"width 0.2s" }}>
        {/* ロゴ */}
        <div style={{ padding:sidebarOpen?"20px 20px 24px":"20px 0 24px", textAlign:sidebarOpen?"left":"center", overflow:"hidden", whiteSpace:"nowrap" }}>
          {sidebarOpen ? (
            <>
              <div style={{ fontSize:11, fontWeight:600, color:DS.text3, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:2 }}>ナイトハウジング</div>
              <div style={{ fontSize:14, fontWeight:700, color:DS.text1, letterSpacing:"-0.01em" }}>管理ダッシュボード</div>
            </>
          ) : (
            <div style={{ fontSize:13, fontWeight:700, color:DS.teal }}>ナイトハウジング</div>
          )}
        </div>

        {/* メニューグループラベル */}
        {sidebarOpen && <div style={{ padding:"0 20px", marginBottom:8, fontSize:10, fontWeight:600, color:DS.text3, letterSpacing:"0.1em", textTransform:"uppercase" }}>Main Menu</div>}

        {/* ナビメニュー */}
        <nav style={{ flex:1, padding:sidebarOpen?"0 12px":"0 8px" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
            {tabs.map(t=>{
              const isActive = tab===t.id;
              const IconComp = t.Icon;
              return (
                <button key={t.id} onClick={()=>{ setTab(t.id); setSelectedMember(null); }} title={sidebarOpen?undefined:t.label} style={{
                  display:"flex", alignItems:"center", gap:10,
                  padding:sidebarOpen?"10px 12px":"10px 0",
                  justifyContent:sidebarOpen?"flex-start":"center",
                  borderRadius:8,
                  border:"none", cursor:"pointer", width:"100%", textAlign:"left",
                  fontSize:13, fontWeight:isActive?600:400,
                  background:isActive?"#F0FDFA":"transparent",
                  color:isActive?DS.teal:"#475569",
                  borderLeft:isActive?`2px solid ${DS.teal}`:"2px solid transparent",
                  transition:"all 0.15s",
                }}>
                  <IconComp size={18} strokeWidth={isActive?2:1.5} style={{ opacity:isActive?1:0.6, flexShrink:0 }}/>
                  {sidebarOpen && <span>{t.label}</span>}
                </button>
              );
            })}
          </div>
        </nav>

        {/* サイドバー下部: 格納ボタン */}
        <div style={{ padding:sidebarOpen?"12px 20px":"12px 0", borderTop:`1px solid ${DS.border}`, display:"flex", justifyContent:sidebarOpen?"flex-start":"center" }}>
          <button onClick={toggleSidebar} style={{ background:"transparent", border:"none", cursor:"pointer", color:DS.text3, padding:"6px", borderRadius:6, display:"flex", alignItems:"center", gap:6, fontSize:11 }}>
            {sidebarOpen ? <><ChevronLeft size={16} strokeWidth={1.5}/> <span>格納</span></> : <ChevronRight size={16} strokeWidth={1.5}/>}
          </button>
        </div>
      </aside>

      {/* メインエリア */}
      <div style={{ flex:1, marginLeft:sidebarW, minHeight:"100vh", transition:"margin-left 0.2s" }}>
        {/* トップヘッダー */}
        <header style={{ height:64, background:"#fff", borderBottom:`1px solid ${DS.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 24px", position:"sticky", top:0, zIndex:40 }}>
          <div style={{ fontSize:18, fontWeight:600, color:DS.text1 }}>{tabs.find(t=>t.id===tab)?.label||"ホーム"}</div>

          {/* 月選択 or 期間表示 */}
          {tab === "overview" ? (
            <div style={{ fontSize:13, fontWeight:500, color:DS.text2 }}>
              {homePeriod === "fiscal" ? `今期（${CURRENT_MONTH >= 3 ? CURRENT_YEAR : CURRENT_YEAR - 1}年3月〜${CURRENT_MONTH >= 3 ? CURRENT_YEAR + 1 : CURRENT_YEAR}年2月）` :
               homePeriod === "thisMonth" ? `${CURRENT_YEAR}年${CURRENT_MONTH}月` :
               homePeriod === "lastMonth" ? `${CURRENT_MONTH===1?CURRENT_YEAR-1:CURRENT_YEAR}年${CURRENT_MONTH===1?12:CURRENT_MONTH-1}月` : "カスタム期間"}
            </div>
          ) : (
          <div style={{ display:"flex", alignItems:"center", gap:4, background:"#F1F5F9", borderRadius:8, padding:"3px" }}>
            {availableMonths.map(m=>{
              const [,mo] = m.split("/");
              const isActive = m === selectedMonth;
              const count = customers.filter(c => {
                const d = c.addedDate || "";
                return d ? d.substring(0, 7).replace("-", "/") === m : false;
              }).length;
              return (
                <button key={m} onClick={()=>{setSelectedMonth(m);}} style={{
                  fontSize:13, fontWeight:isActive?600:400, padding:"6px 16px", borderRadius:6,
                  border:"none", cursor:"pointer", userSelect:"none",
                  background:isActive?"#fff":"transparent",
                  color:isActive?DS.teal:"#475569",
                  boxShadow:isActive?"0 1px 3px rgba(0,0,0,0.08)":"none",
                  transition:"all 0.15s",
                }}>
                  {parseInt(mo)}月<span style={{ fontSize:11, marginLeft:4, opacity:0.7 }}>({count})</span>
                </button>
              );
            })}
          </div>
          )}
        </header>

        {/* コンテンツ */}
        <div style={{ maxWidth:1280, margin:"0 auto", padding:"24px 24px 48px" }}>

      {/* ===== ホーム ===== */}
      {tab==="overview" && (()=>{
        const now = new Date();
        const today = new Date();

        // 今期の開始年（3月始まり）
        const fiscalStartYear = CURRENT_MONTH >= 3 ? CURRENT_YEAR : CURRENT_YEAR - 1;
        const fiscalStartKey = `${fiscalStartYear}/03`;
        const fiscalEndKey = `${fiscalStartYear + 1}/02`;

        // 期間に応じた顧客フィルタ
        const periodCustomers = (() => {
          if (homePeriod === "fiscal") {
            return customers.filter(c => {
              const m = c.addedDate ? c.addedDate.substring(0, 7).replace("-", "/") : "";
              return m >= fiscalStartKey && m <= fiscalEndKey;
            });
          }
          if (homePeriod === "lastMonth") {
            const lmKey = `${CURRENT_MONTH===1?CURRENT_YEAR-1:CURRENT_YEAR}/${String(CURRENT_MONTH===1?12:CURRENT_MONTH-1).padStart(2,"0")}`;
            return customers.filter(c => c.addedDate && c.addedDate.substring(0,7).replace("-","/") === lmKey);
          }
          // thisMonth or default
          return customers.filter(c => c.addedDate && c.addedDate.substring(0,7).replace("-","/") === `${CURRENT_YEAR}/${String(CURRENT_MONTH).padStart(2,"0")}`);
        })();

        const periodRevenue = calcContractRevenue(periodCustomers);
        const periodContracted = periodCustomers.filter(c => CONTRACTED_STATUSES.has(c.status)).length;
        const periodContractRate = periodCustomers.length > 0 ? Math.round((periodContracted / periodCustomers.length) * 100 * 10) / 10 : 0;

        // 前期間比較
        const prevPeriodCustomers = (() => {
          if (homePeriod === "fiscal") {
            const prevStart = `${fiscalStartYear - 1}/03`;
            const prevEnd = `${fiscalStartYear}/02`;
            return customers.filter(c => {
              const m = c.addedDate ? c.addedDate.substring(0, 7).replace("-", "/") : "";
              return m >= prevStart && m <= prevEnd;
            });
          }
          if (homePeriod === "lastMonth") {
            const pm = CURRENT_MONTH <= 2 ? CURRENT_MONTH + 10 : CURRENT_MONTH - 2;
            const py = CURRENT_MONTH <= 2 ? CURRENT_YEAR - 1 : CURRENT_YEAR;
            return customers.filter(c => c.addedDate && c.addedDate.substring(0,7).replace("-","/") === `${py}/${String(pm).padStart(2,"0")}`);
          }
          const lmKey = `${CURRENT_MONTH===1?CURRENT_YEAR-1:CURRENT_YEAR}/${String(CURRENT_MONTH===1?12:CURRENT_MONTH-1).padStart(2,"0")}`;
          return customers.filter(c => c.addedDate && c.addedDate.substring(0,7).replace("-","/") === lmKey);
        })();
        const prevRevenue = calcContractRevenue(prevPeriodCustomers);
        const prevContracted = prevPeriodCustomers.filter(c => CONTRACTED_STATUSES.has(c.status)).length;
        const prevContractRate = prevPeriodCustomers.length > 0 ? Math.round((prevContracted / prevPeriodCustomers.length) * 100 * 10) / 10 : 0;

        // KPIラベル
        const periodLabel = homePeriod === "fiscal" ? "今期" : homePeriod === "lastMonth" ? `${CURRENT_MONTH===1?12:CURRENT_MONTH-1}月` : `${CURRENT_MONTH}月`;

        // [STEP4] 未対応案件リストは廃止。デイリーKPIの件数表示用にcountのみ参照。
        const pendingCases = customers.filter(c => c.status === "未対応");

        // デイリーKPI
        const activeCustomers = customers.filter(c => !["失注（離脱中・シナリオ配信中）","AD着金済み"].includes(c.status));
        const overdueCount = overdueData ? overdueData.total : 0;
        const replyRate = activeCustomers.length > 0 ? Math.round(((activeCustomers.length - overdueCount) / activeCustomers.length) * 100) : 100;

        const currentMonthKey = `${CURRENT_YEAR}-${String(CURRENT_MONTH).padStart(2,"0")}`;
        const monthGoals = goals.filter(g => g.month === currentMonthKey);
        const totalSalesTarget = monthGoals.reduce((s, g) => s + (Number(g.salesTarget) || 0), 0);
        const currentMonthRevenue = calcContractRevenue(customers.filter(c => c.addedDate && c.addedDate.substring(0,7).replace("-","/") === `${CURRENT_YEAR}/${String(CURRENT_MONTH).padStart(2,"0")}`));
        const goalRate = totalSalesTarget > 0 ? Math.round((currentMonthRevenue / totalSalesTarget) * 100) : 0;
        const dayOfMonth = today.getDate();
        const daysInMonth = new Date(CURRENT_YEAR, CURRENT_MONTH, 0).getDate();
        const expectedRate = Math.round((dayOfMonth / daysInMonth) * 100);

        // 今週の着金予定
        const dayOfWeek = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        monday.setHours(0,0,0,0);
        // [STEP4] 月〜日の7日表示に変更（旧: 5日 月〜金）
        const weekDays = Array.from({length:7}, (_,i) => {
          const d = new Date(monday);
          d.setDate(monday.getDate() + i);
          return d;
        });
        const dayLabels = ["月","火","水","木","金","土","日"];
        const allPayments = buildPaymentsFromCustomers(customers);
        const weekPayments = weekDays.map((d, i) => {
          const dateStr = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`;
          const dayItems = allPayments.filter(p => (p.date || "").replace(/-/g, "/") === dateStr);
          const fee = dayItems.filter(p=>p.type==="仲介手数料").reduce((s,p)=>s+p.amount,0);
          const ad = dayItems.filter(p=>p.type==="AD").reduce((s,p)=>s+p.amount,0);
          const other = dayItems.filter(p=>p.type==="その他売上").reduce((s,p)=>s+p.amount,0);
          const paidCount = dayItems.filter(p=>p.status==="着金").length;
          const isToday = d.toDateString() === today.toDateString();
          const isPast = d < today && !isToday;
          return { date:d, label:dayLabels[i], dateStr, items:dayItems, fee, ad, other, total:fee+ad+other, count:dayItems.length, paidCount, isToday, isPast };
        });

        return (
          <div>
            {/* 期間選択 */}
            <div style={{ display:"flex", alignItems:"center", gap:4, background:"#F1F5F9", borderRadius:8, padding:"3px", marginBottom:20 }}>
              {[
                { id:"fiscal", label:"今期" },
                { id:"thisMonth", label:"今月" },
                { id:"lastMonth", label:"先月" },
              ].map(p => (
                <button key={p.id} onClick={()=>setHomePeriod(p.id)} style={{
                  fontSize:13, fontWeight:homePeriod===p.id?600:400, padding:"6px 16px", borderRadius:6,
                  border:"none", cursor:"pointer", userSelect:"none",
                  background:homePeriod===p.id?"#fff":"transparent",
                  color:homePeriod===p.id?DS.teal:"#475569",
                  boxShadow:homePeriod===p.id?"0 1px 3px rgba(0,0,0,0.08)":"none",
                  transition:"all 0.15s",
                }}>{p.label}</button>
              ))}
            </div>

            {/* KPI x3 */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:16, marginBottom:24 }}>
              <div style={{ background:DS.card, borderRadius:DS.radius, padding:"24px 20px", border:`1px solid ${DS.border}`, boxShadow:DS.shadow }}>
                <div style={{ marginBottom:8, color:DS.text3 }}><Wallet size={20} strokeWidth={1.5}/></div>
                <div style={{ fontSize:12, fontWeight:500, color:DS.text2, letterSpacing:"0.04em", marginBottom:8 }}>{periodLabel}の売上</div>
                <div style={{ fontSize:32, fontWeight:700, color:DS.teal, lineHeight:1, fontVariantNumeric:"tabular-nums" }}>¥{periodRevenue.toLocaleString()}</div>
                <div style={{ fontSize:11, marginTop:6, display:"flex", alignItems:"center", gap:3, color:periodRevenue>=prevRevenue?DS.emerald:DS.rose }}>
                  {periodRevenue>=prevRevenue?<ArrowUpRight size={12} strokeWidth={1.5}/>:<ArrowDownRight size={12} strokeWidth={1.5}/>}
                  前期間比 {periodRevenue>=prevRevenue?"+":""}¥{(periodRevenue-prevRevenue).toLocaleString()}
                </div>
              </div>
              <div style={{ background:DS.card, borderRadius:DS.radius, padding:"24px 20px", border:`1px solid ${DS.border}`, boxShadow:DS.shadow }}>
                <div style={{ marginBottom:8, color:DS.text3 }}><Users size={20} strokeWidth={1.5}/></div>
                <div style={{ fontSize:12, fontWeight:500, color:DS.text2, letterSpacing:"0.04em", marginBottom:8 }}>{periodLabel}の友達追加</div>
                <div style={{ fontSize:32, fontWeight:700, color:DS.indigo, lineHeight:1, fontVariantNumeric:"tabular-nums" }}>{periodCustomers.length}人</div>
                <div style={{ fontSize:11, marginTop:6, display:"flex", alignItems:"center", gap:3, color:periodCustomers.length>=prevPeriodCustomers.length?DS.emerald:DS.rose }}>
                  {periodCustomers.length>=prevPeriodCustomers.length?<ArrowUpRight size={12} strokeWidth={1.5}/>:<ArrowDownRight size={12} strokeWidth={1.5}/>}
                  前期間比 {periodCustomers.length>=prevPeriodCustomers.length?"+":""}{periodCustomers.length-prevPeriodCustomers.length}人
                </div>
              </div>
              <div style={{ background:DS.card, borderRadius:DS.radius, padding:"24px 20px", border:`1px solid ${DS.border}`, boxShadow:DS.shadow }}>
                <div style={{ marginBottom:8, color:DS.text3 }}><TrendingUp size={20} strokeWidth={1.5}/></div>
                <div style={{ fontSize:12, fontWeight:500, color:DS.text2, letterSpacing:"0.04em", marginBottom:8 }}>{periodLabel}の契約率</div>
                <div style={{ fontSize:32, fontWeight:700, color:periodContractRate>=40?DS.emerald:periodContractRate>=25?DS.indigo:DS.rose, lineHeight:1, fontVariantNumeric:"tabular-nums" }}>{periodContractRate}%</div>
                <div style={{ fontSize:11, marginTop:6, display:"flex", alignItems:"center", gap:3, color:periodContractRate>=prevContractRate?DS.emerald:DS.rose }}>
                  {periodContractRate>=prevContractRate?<ArrowUpRight size={12} strokeWidth={1.5}/>:<ArrowDownRight size={12} strokeWidth={1.5}/>}
                  前期間比 {periodContractRate>=prevContractRate?"+":""}{(periodContractRate-prevContractRate).toFixed(1)}pt
                </div>
              </div>
            </div>

            {/* 売上4ボックス: 仲介 / AD / その他 / 合計（各ボックス内に 見込み・成約・着金 の3軸） */}
            {homeSales3Axis && (() => {
              const types = [
                { id:"fee",   label:"仲介手数料売上", color:DS.teal,    accent:"#0F766E" },
                { id:"ad",    label:"AD売上",         color:DS.indigo,  accent:"#4338CA" },
                { id:"other", label:"その他売上",     color:"#7C3AED",  accent:"#6D28D9" },
                { id:"total", label:"合計売上",       color:DS.emerald, accent:"#047857" },
              ];
              const get = (axisData, typeId) => typeId === "total" ? (axisData.total || 0) : (axisData[typeId] || 0);
              return (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 }}>
                  {types.map(t=>(
                    <div key={t.id} style={{ background:DS.card, borderRadius:DS.radius, padding:"16px 18px", border:`1px solid ${DS.border}`, borderTop:`3px solid ${t.color}`, boxShadow:DS.shadow }}>
                      <div style={{ fontSize:12, fontWeight:600, color:t.color, marginBottom:10 }}>{t.label}</div>
                      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                        <div>
                          <div style={{ fontSize:10, color:DS.amber, fontWeight:600 }}>見込み</div>
                          <div style={{ fontSize:18, fontWeight:600, color:DS.text1, fontVariantNumeric:"tabular-nums" }}>¥{get(homeSales3Axis.prospect, t.id).toLocaleString()}</div>
                        </div>
                        <div>
                          <div style={{ fontSize:10, color:DS.indigo, fontWeight:600 }}>成約ベース</div>
                          <div style={{ fontSize:18, fontWeight:600, color:DS.text1, fontVariantNumeric:"tabular-nums" }}>¥{get(homeSales3Axis.contract_based, t.id).toLocaleString()}</div>
                        </div>
                        <div>
                          <div style={{ fontSize:10, color:DS.emerald, fontWeight:600 }}>着金ベース</div>
                          <div style={{ fontSize:20, fontWeight:700, color:t.accent, fontVariantNumeric:"tabular-nums" }}>¥{get(homeSales3Axis.received_based, t.id).toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* [STEP4] 着金カレンダー（全幅・7日） — 未対応案件リストは廃止 */}
            <div style={{ marginBottom:24 }}>
              <Card>
                <div style={{ fontSize:14, fontWeight:700, marginBottom:16 }}>今週の着金予定</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:8 }}>
                  {weekPayments.map(d => (
                    <div key={d.label} style={{ background:d.isToday?"#F0FDFA":DS.pageBg, borderRadius:DS.radiusSm, padding:12, border:d.isToday?`2px solid ${DS.teal}`:`1px solid ${DS.border}`, minHeight:120 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                        <span style={{ fontSize:13, fontWeight:d.isToday?700:500, color:d.isToday?DS.teal:DS.text1 }}>{d.label}</span>
                        <span style={{ fontSize:10, color:DS.text3 }}>{d.date.getMonth()+1}/{d.date.getDate()}</span>
                      </div>
                      {d.count === 0 ? (
                        <div style={{ fontSize:11, color:DS.text3, marginTop:12 }}>--</div>
                      ) : (
                        <>
                          <div style={{ fontSize:18, fontWeight:700, color:DS.text1, fontVariantNumeric:"tabular-nums", marginBottom:6 }}>{d.total.toLocaleString()}円</div>
                          <div style={{ fontSize:10, color:DS.text2, marginBottom:4 }}>{d.count}件</div>
                          {d.fee > 0 && <div style={{ fontSize:10, display:"flex", alignItems:"center", gap:4, marginBottom:2 }}><span style={{ width:6, height:6, borderRadius:1, background:DS.teal, display:"inline-block" }}/> 仲介 {d.fee.toLocaleString()}</div>}
                          {d.ad > 0 && <div style={{ fontSize:10, display:"flex", alignItems:"center", gap:4, marginBottom:2 }}><span style={{ width:6, height:6, borderRadius:1, background:DS.indigo, display:"inline-block" }}/> AD {d.ad.toLocaleString()}</div>}
                          {d.other > 0 && <div style={{ fontSize:10, display:"flex", alignItems:"center", gap:4, marginBottom:2 }}><span style={{ width:6, height:6, borderRadius:1, background:DS.text3, display:"inline-block" }}/> 他 {d.other.toLocaleString()}</div>}
                          {d.paidCount > 0 && <div style={{ fontSize:10, color:DS.emerald, fontWeight:600, marginTop:4, display:"flex", alignItems:"center", gap:3 }}><CheckCircle size={10} strokeWidth={1.5}/> {d.paidCount}件着金済</div>}
                          {d.isPast && d.paidCount < d.count && <div style={{ fontSize:10, color:DS.rose, fontWeight:600, marginTop:2, display:"flex", alignItems:"center", gap:3 }}><AlertTriangle size={10} strokeWidth={1.5}/> {d.count - d.paidCount}件未着金</div>}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </Card>

            </div>

            {/* [STEP4] デイリーKPI: 横長1ボックスの中に3つの小ボックス */}
            <div style={{ background:DS.card, borderRadius:DS.radius, padding:"20px 24px", border:`1px solid ${DS.border}`, boxShadow:DS.shadow, marginBottom:24 }}>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:16, color:DS.text1 }}>デイリーKPI</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:12 }}>
                <div style={{ background:DS.pageBg, borderRadius:DS.radiusSm, padding:"16px", border:`1px solid ${DS.border}` }}>
                  <div style={{ fontSize:11, color:DS.text2, marginBottom:6 }}>チーム返信率</div>
                  <div style={{ fontSize:28, fontWeight:700, color:replyRate>=80?DS.emerald:replyRate>=50?DS.amber:DS.rose, fontVariantNumeric:"tabular-nums" }}>{replyRate}%</div>
                  <div style={{ fontSize:10, color:DS.text3, marginTop:4 }}>未返信 {overdueCount}件 / 進行中 {activeCustomers.length}件</div>
                </div>
                <div style={{ background:DS.pageBg, borderRadius:DS.radiusSm, padding:"16px", border:`1px solid ${DS.border}` }}>
                  <div style={{ fontSize:11, color:DS.text2, marginBottom:6 }}>案件進行数</div>
                  <div style={{ fontSize:28, fontWeight:700, color:DS.indigo, fontVariantNumeric:"tabular-nums" }}>{activeCustomers.length}件</div>
                  <div style={{ fontSize:10, color:DS.text3, marginTop:4 }}>未対応 {pendingCases.length}件を含む</div>
                </div>
                <div style={{ background:DS.pageBg, borderRadius:DS.radiusSm, padding:"16px", border:`1px solid ${DS.border}` }}>
                  <div style={{ fontSize:11, color:DS.text2, marginBottom:6 }}>{CURRENT_MONTH}月の目標達成率</div>
                  <div style={{ fontSize:28, fontWeight:700, color:goalRate>=expectedRate?DS.emerald:DS.rose, fontVariantNumeric:"tabular-nums" }}>{goalRate > 0 ? `${goalRate}%` : "−"}</div>
                  <div style={{ fontSize:10, color:DS.text3, marginTop:4 }}>{totalSalesTarget > 0 ? `¥${currentMonthRevenue.toLocaleString()} / ¥${totalSalesTarget.toLocaleString()}` : "目標未設定"}</div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===== 月次サマリー ===== */}
      {tab==="summary" && (()=>{
        const friendsAdded = mc.length;
        const contracted = mc.filter(c=>CONTRACTED_STATUSES.has(c.status)).length;
        const active = mc.filter(c=>!["失注（離脱中・シナリオ配信中）","AD着金済み"].includes(c.status)).length;
        const lost = mc.filter(c=>c.status==="失注（離脱中・シナリオ配信中）").length;
        const nyukinCount = mc.filter(c=>{const si=PIPELINE_ORDER.indexOf(c.status);return si>=PIPELINE_ORDER.indexOf("仲介手数料着金済み");}).length;
        const totalEstimate = calcContractRevenue(mc);

        // 選択月のコホート契約率（この月に追加された顧客のうち契約済みの割合）
        const cohortContracted = mc.filter(c=>CONTRACTED_STATUSES.has(c.status)).length;
        const activatedThisMonth = mc.length;
        const currentMonthRate = activatedThisMonth ? Math.round((cohortContracted/activatedThisMonth)*100) : 0;
        // 選択月の契約数（contractDateベース：その月に契約成立した件数）
        const contractedThisMonth = contractedInMonth(selectedMonth);

        // 前月比較（トレンド）
        const [smY, smM] = summaryMonth.split("/").map(Number);
        const prevMonthKey = `${smM===1?smY-1:smY}/${String(smM===1?12:smM-1).padStart(2,"0")}`;
        const prevMc = customers.filter(c => c.addedDate && c.addedDate.substring(0,7).replace("-","/") === prevMonthKey);
        const prevContracted = prevMc.filter(c=>CONTRACTED_STATUSES.has(c.status)).length;
        const prevRate = prevMc.length ? Math.round((prevContracted/prevMc.length)*100) : 0;
        const prevRevenue = calcContractRevenue(prevMc);
        const rateDiff = currentMonthRate - prevRate;
        const revenueDiff = totalEstimate - prevRevenue;

        // コホート分析: 全期間の友達追加月ごとの契約率（全顧客から集計）
        const cohortMap = {};
        customers.forEach(c => {
          const m = c.addedDate ? c.addedDate.substring(0, 7).replace("-", "/") : "不明";
          if (!cohortMap[m]) cohortMap[m] = { month: m, added: 0, contracted: 0, lost: 0 };
          cohortMap[m].added++;
          if (CONTRACTED_STATUSES.has(c.status)) cohortMap[m].contracted++;
          if (c.status === "失注（離脱中・シナリオ配信中）") cohortMap[m].lost++;
        });
        const cohorts = Object.values(cohortMap).sort((a, b) => a.month.localeCompare(b.month));

        return (
          <div>
            {/* タイトル + 期間セレクター */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
              <div>
                <div style={{ fontSize:18, fontWeight:600 }}>月次サマリー</div>
                <div style={{ fontSize:12, color:DS.text2, marginTop:2 }}>エルステップ連携データ　／　自動集計</div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                {/* 今月/先月 クイックアクセス */}
                {[
                  { label:"今月", value:`${CURRENT_YEAR}/${String(CURRENT_MONTH).padStart(2,"0")}` },
                  { label:"先月", value:`${CURRENT_MONTH===1?CURRENT_YEAR-1:CURRENT_YEAR}/${String(CURRENT_MONTH===1?12:CURRENT_MONTH-1).padStart(2,"0")}` },
                ].map(p=>(
                  <button key={p.label} onClick={()=>{setSummaryMonth(p.value);setSelectedMonth(p.value);}} style={{
                    padding:"5px 12px", fontSize:12, fontWeight:summaryMonth===p.value?600:400,
                    borderRadius:6, border:`1px solid ${summaryMonth===p.value?DS.teal:DS.border}`,
                    background:summaryMonth===p.value?"#F0FDFA":DS.card, color:summaryMonth===p.value?DS.teal:DS.text2,
                    cursor:"pointer",
                  }}>{p.label}</button>
                ))}
                <div style={{ width:1, height:20, background:DS.border, margin:"0 4px" }}/>
                {/* 期間レンジ */}
                {[3,6,12].map(n=>(
                  <button key={n} onClick={()=>setSummaryRange(n)} style={{
                    padding:"5px 10px", fontSize:11, fontWeight:summaryRange===n?600:400,
                    borderRadius:6, border:`1px solid ${summaryRange===n?DS.indigo:DS.border}`,
                    background:summaryRange===n?"#EEF2FF":DS.card, color:summaryRange===n?DS.indigo:DS.text2,
                    cursor:"pointer",
                  }}>{n}ヶ月</button>
                ))}
              </div>
            </div>

            {/* ── セクション1: 全体KPI ── */}
            <div style={{ fontSize:12, color:DS.text2, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>全体KPI</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:"1.75rem" }}>
              {(()=>{
                const friendsDiff = friendsAdded - prevMc.length;
                const prevContractedCount = prevMc.filter(c=>CONTRACTED_STATUSES.has(c.status)).length;
                const contractedDiff = contracted - prevContractedCount;
                return [
                  { label:"契約ベース売上", value:`¥${totalEstimate.toLocaleString()}`, diff:revenueDiff, diffStr:`¥${Math.abs(revenueDiff).toLocaleString()}`, color:DS.amber, bg:"#FEF3C7", icon:<Wallet size={20} strokeWidth={1.5} color={DS.amber}/> },
                  { label:"今月契約", value:`${contracted}件`, diff:contractedDiff, diffStr:`${Math.abs(contractedDiff)}件`, color:DS.emerald, bg:"#D1FAE5", icon:<CheckCircle size={20} strokeWidth={1.5} color={DS.emerald}/> },
                  { label:"友達追加", value:`${friendsAdded}名`, diff:friendsDiff, diffStr:`${Math.abs(friendsDiff)}名`, color:DS.indigo, bg:"#EEF2FF", icon:<Users size={20} strokeWidth={1.5} color={DS.indigo}/> },
                  { label:"契約率",   value:`${currentMonthRate}%`, diff:rateDiff, diffStr:`${Math.abs(rateDiff)}pt`, color:DS.indigo, bg:"#EEF2FF", icon:<TrendingUp size={20} strokeWidth={1.5} color={DS.indigo}/> },
                ].map(c=>(
                  <div key={c.label} style={{ background:c.bg, borderRadius:DS.radius, padding:"1.1rem 1.25rem" }}>
                    <div style={{ marginBottom:6 }}>{c.icon}</div>
                    <div style={{ fontSize:11, color:c.color, marginBottom:4 }}>{c.label}</div>
                    <div style={{ fontSize:26, fontWeight:600, color:c.color, lineHeight:1.1, fontVariantNumeric:"tabular-nums" }}>{c.value}</div>
                    <div style={{ fontSize:11, marginTop:4, display:"flex", alignItems:"center", gap:3, color:c.diff>=0?DS.emerald:DS.rose }}>
                      {c.diff>=0?<ArrowUpRight size={12} strokeWidth={1.5}/>:<ArrowDownRight size={12} strokeWidth={1.5}/>}
                      先月比 {c.diff>=0?"+":"-"}{c.diffStr}
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* ── 全体目標 ── */}
            <div style={{ fontSize:12, color:DS.text2, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>全体目標</div>
            <div style={{ background:DS.card, border:`1px solid ${DS.border}`, borderRadius:DS.radius, padding:"1.25rem", marginBottom:"1.75rem" }}>
              {teamGoalEditing ? (
                <div>
                  <div style={{ fontSize:13, fontWeight:600, marginBottom:12 }}>{smM}月のチーム全体目標を設定</div>
                  <div style={{ display:"flex", gap:16, marginBottom:12 }}>
                    <div style={{ flex:1 }}>
                      <label style={{ fontSize:11, color:DS.text2, display:"block", marginBottom:4 }}>売上目標（円）</label>
                      <input type="number" value={teamGoalDraft.salesTarget} onChange={e=>setTeamGoalDraft(d=>({...d,salesTarget:e.target.value}))}
                        style={{ width:"100%", padding:"8px 12px", fontSize:14, border:`1px solid ${DS.border}`, borderRadius:6, outline:"none", boxSizing:"border-box" }}
                        placeholder="例: 3000000" />
                    </div>
                    <div style={{ flex:1 }}>
                      <label style={{ fontSize:11, color:DS.text2, display:"block", marginBottom:4 }}>契約目標（件）</label>
                      <input type="number" value={teamGoalDraft.contractTarget} onChange={e=>setTeamGoalDraft(d=>({...d,contractTarget:e.target.value}))}
                        style={{ width:"100%", padding:"8px 12px", fontSize:14, border:`1px solid ${DS.border}`, borderRadius:6, outline:"none", boxSizing:"border-box" }}
                        placeholder="例: 15" />
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={()=>{
                      setTeamGoal({ salesTarget:Number(teamGoalDraft.salesTarget)||0, contractTarget:Number(teamGoalDraft.contractTarget)||0 });
                      setTeamGoalEditing(false);
                      showToast("全体目標を保存しました");
                    }} style={{ padding:"7px 20px", fontSize:12, fontWeight:600, background:DS.teal, color:"#fff", border:"none", borderRadius:6, cursor:"pointer" }}>保存</button>
                    <button onClick={()=>setTeamGoalEditing(false)} style={{ padding:"7px 20px", fontSize:12, color:DS.text2, background:DS.beige, border:"none", borderRadius:6, cursor:"pointer" }}>キャンセル</button>
                  </div>
                </div>
              ) : (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ display:"flex", gap:24 }}>
                    <div>
                      <div style={{ fontSize:11, color:DS.text2, marginBottom:2 }}>{smM}月 売上目標</div>
                      <div style={{ fontSize:22, fontWeight:600, color:DS.amber, fontVariantNumeric:"tabular-nums" }}>
                        {teamGoal.salesTarget > 0 ? `¥${teamGoal.salesTarget.toLocaleString()}` : "未設定"}
                      </div>
                      {teamGoal.salesTarget > 0 && <div style={{ fontSize:11, color:total>=teamGoal.salesTarget?DS.emerald:DS.rose, marginTop:2 }}>
                        達成率 {Math.round((total/teamGoal.salesTarget)*100)}%（実績 ¥{total.toLocaleString()}）
                      </div>}
                    </div>
                    <div>
                      <div style={{ fontSize:11, color:DS.text2, marginBottom:2 }}>{smM}月 契約目標</div>
                      <div style={{ fontSize:22, fontWeight:600, color:DS.emerald, fontVariantNumeric:"tabular-nums" }}>
                        {teamGoal.contractTarget > 0 ? `${teamGoal.contractTarget}件` : "未設定"}
                      </div>
                      {teamGoal.contractTarget > 0 && <div style={{ fontSize:11, color:contracted>=teamGoal.contractTarget?DS.emerald:DS.rose, marginTop:2 }}>
                        達成率 {Math.round((contracted/teamGoal.contractTarget)*100)}%（実績 {contracted}件）
                      </div>}
                    </div>
                  </div>
                  <button onClick={()=>{
                    setTeamGoalDraft({ salesTarget:String(teamGoal.salesTarget||""), contractTarget:String(teamGoal.contractTarget||"") });
                    setTeamGoalEditing(true);
                  }} style={{ padding:"7px 16px", fontSize:12, fontWeight:500, background:DS.beige, color:DS.text1, border:`1px solid ${DS.border}`, borderRadius:6, cursor:"pointer" }}>
                    {teamGoal.salesTarget > 0 ? "編集" : "目標を設定"}
                  </button>
                </div>
              )}
            </div>

            {/* ── セクション2: 契約率（70/30分割） ── */}
            <div style={{ fontSize:12, color:DS.text2, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>契約率分析</div>
            <div style={{ display:"grid", gridTemplateColumns:"7fr 3fr", gap:16, marginBottom:"1.75rem" }}>

              {/* 当月の契約率 + 契約数 */}
              <div style={{ background:DS.card, border:`1px solid ${DS.border}`, borderRadius:DS.radius, padding:"1.25rem" }}>
                <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>友だち追加月ベース契約率</div>
                <div style={{ fontSize:11, color:DS.text2, marginBottom:16 }}>この月に追加された顧客のうち契約済みの割合</div>
                <div style={{ display:"flex", alignItems:"flex-end", gap:12, marginBottom:16 }}>
                  <div style={{ fontSize:52, fontWeight:500, lineHeight:1, color:currentMonthRate>=40?DS.emerald:currentMonthRate>=25?DS.indigo:DS.rose }}>{currentMonthRate}<span style={{ fontSize:24 }}>%</span></div>
                  <div style={{ paddingBottom:4 }}>
                    <div style={{ fontSize:12, color:DS.text2 }}>目標: 40%</div>
                    <div style={{ fontSize:12, color:currentMonthRate>=40?DS.emerald:DS.rose, fontWeight:500 }}>{currentMonthRate>=40?"達成":"未達"}</div>
                    {prevRate > 0 && <div style={{ fontSize:11, color:rateDiff>=0?DS.emerald:DS.rose, marginTop:2, display:"flex", alignItems:"center", gap:3 }}>
                      {rateDiff>=0?<ArrowUpRight size={12} strokeWidth={1.5}/>:<ArrowDownRight size={12} strokeWidth={1.5}/>}
                      前月比 {rateDiff>=0?"+":""}{rateDiff}pt
                    </div>}
                  </div>
                </div>
                <div style={{ width:"100%", height:10, background:DS.beige, borderRadius:5, overflow:"hidden", marginBottom:10 }}>
                  <div style={{ width:`${currentMonthRate}%`, height:"100%", background:currentMonthRate>=40?DS.emerald:currentMonthRate>=25?DS.indigo:DS.rose, borderRadius:5 }}/>
                </div>
                <div style={{ display:"flex", gap:16, fontSize:12, color:DS.text2 }}>
                  <span>友達追加 <b style={{ color:DS.text1 }}>{activatedThisMonth}名</b></span>
                  <span>契約済み <b style={{ color:DS.emerald }}>{cohortContracted}件</b></span>
                  <span>失注 <b style={{ color:DS.rose }}>{lost}件</b></span>
                </div>
                {contractedThisMonth > 0 && (
                  <div style={{ marginTop:10, padding:"8px 12px", background:"#D1FAE5", borderRadius:8, fontSize:12, color:DS.emerald }}>
                    この月に契約成立: <b>{contractedThisMonth}件</b>（契約日ベース）
                  </div>
                )}
              </div>

              {/* コホート分析 */}
              <div style={{ background:DS.card, border:`1px solid ${DS.border}`, borderRadius:DS.radius, padding:"1.25rem" }}>
                <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>コホート分析（友達追加月別）</div>
                <div style={{ fontSize:11, color:DS.text2, marginBottom:16 }}>各月に追加された顧客のその後の契約率推移</div>
                <table style={{ width:"100%", fontSize:12, borderCollapse:"collapse" }}>
                  <thead>
                    <tr style={{ borderBottom:`1px solid ${DS.border}` }}>
                      {["追加月","友達追加数","契約済み","失注","契約率"].map(h=>(
                        <th key={h} style={{ padding:"6px 8px", textAlign:"left", fontSize:11, color:DS.text2, fontWeight:400 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cohorts.map((c,i)=>{
                      const rate = c.added ? Math.round((c.contracted/c.added)*100) : 0;
                      const isCurrentMonth = i===cohorts.length-1;
                      return (
                        <tr key={c.month} style={{ borderBottom:`1px solid ${DS.border}`, background:isCurrentMonth?DS.hover:"transparent" }}>
                          <td style={{ padding:"8px 8px", fontWeight:isCurrentMonth?500:400 }}>{c.month} {isCurrentMonth&&<span style={{ fontSize:10, color:DS.indigo, background:"#EEF2FF", padding:"1px 5px", borderRadius:3, marginLeft:4 }}>今月</span>}</td>
                          <td style={{ padding:"8px 8px" }}>{c.added}名</td>
                          <td style={{ padding:"8px 8px", color:DS.emerald, fontWeight:500 }}>{c.contracted}件</td>
                          <td style={{ padding:"8px 8px", color:DS.rose }}>{c.lost}件</td>
                          <td style={{ padding:"8px 8px" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                              <div style={{ width:50, height:7, background:DS.beige, borderRadius:3, overflow:"hidden" }}>
                                <div style={{ width:`${rate}%`, height:"100%", background:rate>=40?DS.emerald:rate>=25?DS.indigo:DS.rose, borderRadius:3 }}/>
                              </div>
                              <span style={{ fontWeight:500, color:rate>=40?DS.emerald:rate>=25?DS.indigo:DS.rose }}>{rate}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div style={{ fontSize:11, color:DS.text2, marginTop:10 }}>※ 過去月は最終確定値。今月は進行中のため変動します。</div>
              </div>
            </div>

            {/* ── セクション3: 進捗別内訳 ── */}
            <div style={{ fontSize:12, color:DS.text2, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>進捗ステータス内訳</div>
            <div style={{ background:DS.card, border:`1px solid ${DS.border}`, borderRadius:DS.radius, padding:"1.25rem", marginBottom:"1.75rem" }}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:16 }}>
                {[
                  { label:"進行中",   value:active,      total:friendsAdded, color:DS.indigo, bg:"#EEF2FF" },
                  { label:"着金済み", value:nyukinCount,  total:friendsAdded, color:DS.emerald, bg:"#D1FAE5" },
                  { label:"失注",     value:lost,        total:friendsAdded, color:DS.rose, bg:"#FFF1F2" },
                ].map(s=>(
                  <div key={s.label} style={{ background:s.bg, borderRadius:DS.radiusSm, padding:"1rem 1.25rem" }}>
                    <div style={{ fontSize:12, color:s.color, marginBottom:6 }}>{s.label}</div>
                    <div style={{ fontSize:28, fontWeight:500, color:s.color, fontVariantNumeric:"tabular-nums" }}>{s.value}<span style={{ fontSize:14 }}>件</span></div>
                    <div style={{ width:"100%", height:6, background:"#E2E8F0", borderRadius:3, overflow:"hidden", marginTop:8 }}>
                      <div style={{ width:`${s.total?Math.round((s.value/s.total)*100):0}%`, height:"100%", background:s.color, borderRadius:3 }}/>
                    </div>
                    <div style={{ fontSize:11, color:s.color, opacity:0.8, marginTop:4 }}>{s.total?Math.round((s.value/s.total)*100):0}%</div>
                  </div>
                ))}
              </div>
              {STATUSES.map(st=>{
                const count=mc.filter(c=>c.status===st).length;
                const pct=friendsAdded?Math.round((count/friendsAdded)*100):0;
                const s=STATUS_STYLE[st];
                return (
                  <div key={st} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
                    <span style={{ fontSize:12, minWidth:80, color:DS.text2 }}>{st}</span>
                    <div style={{ flex:1, height:10, background:DS.beige, borderRadius:5, overflow:"hidden" }}>
                      <div style={{ width:`${pct}%`, height:"100%", background:s.text, borderRadius:5, opacity:0.7 }}/>
                    </div>
                    <span style={{ fontSize:12, fontWeight:500, minWidth:30, textAlign:"right" }}>{count}件</span>
                    <span style={{ fontSize:11, color:DS.text2, minWidth:30 }}>{pct}%</span>
                  </div>
                );
              })}
            </div>

            {/* ── セクション3: 着金状況 ── */}
            <div style={{ fontSize:12, color:DS.text2, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>着金状況</div>
            <div style={{ background:DS.card, border:`1px solid ${DS.border}`, borderRadius:DS.radius, padding:"1.25rem", marginBottom:"1.75rem" }}>
              <div style={{ display:"flex", gap:12, marginBottom:16 }}>
                <div style={{ flex:1, background:"#D1FAE5", borderRadius:DS.radiusSm, padding:"1rem 1.25rem" }}>
                  <div style={{ fontSize:12, color:DS.emerald, marginBottom:4 }}>着金済み</div>
                  <div style={{ fontSize:26, fontWeight:500, color:DS.emerald, fontVariantNumeric:"tabular-nums" }}>{(received).toLocaleString()}円</div>
                  <div style={{ fontSize:12, color:DS.emerald, marginTop:4 }}>{total?Math.round((received/total)*100):0}%</div>
                </div>
                <div style={{ flex:1, background:"#EEF2FF", borderRadius:DS.radiusSm, padding:"1rem 1.25rem" }}>
                  <div style={{ fontSize:12, color:DS.indigo, marginBottom:4 }}>未着金（入金待ち）</div>
                  <div style={{ fontSize:26, fontWeight:500, color:DS.indigo, fontVariantNumeric:"tabular-nums" }}>{(pending).toLocaleString()}円</div>
                  <div style={{ fontSize:12, color:DS.indigo, marginTop:4 }}>{total?Math.round((pending/total)*100):0}%</div>
                </div>
                <div style={{ flex:1, background:DS.beige, borderRadius:DS.radiusSm, padding:"1rem 1.25rem" }}>
                  <div style={{ fontSize:12, color:DS.text2, marginBottom:4 }}>着金率</div>
                  <div style={{ fontSize:26, fontWeight:500, fontVariantNumeric:"tabular-nums" }}>{total?Math.round((received/total)*100):0}%</div>
                  <div style={{ width:"100%", height:6, background:"#E2E8F0", borderRadius:3, overflow:"hidden", marginTop:8 }}>
                    <div style={{ width:`${total?Math.round((received/total)*100):0}%`, height:"100%", background:DS.emerald, borderRadius:3 }}/>
                  </div>
                </div>
              </div>
              <table style={{ width:"100%", fontSize:13, borderCollapse:"collapse" }}>
                <thead><tr style={{ borderBottom:`1px solid ${DS.border}` }}>
                  {["顧客","物件","金額","状態","着金予定日","担当"].map(h=><th key={h} style={{ padding:"6px 10px", textAlign:"left", fontSize:11, color:DS.text2, fontWeight:400 }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {payments.map(p=>(
                    <tr key={p.id} style={{ borderBottom:`1px solid ${DS.border}` }}>
                      <td style={{ padding:"8px 10px", fontWeight:500 }}>{p.name}</td>
                      <td style={{ padding:"8px 10px", color:DS.text2 }}>{p.property}</td>
                      <td style={{ padding:"8px 10px", fontWeight:500 }}>{(p.amount).toLocaleString()}円</td>
                      <td style={{ padding:"8px 10px" }}>
                        <span style={{ fontSize:11, padding:"3px 10px", borderRadius:4, background:p.status==="着金"?"#D1FAE5":"#EEF2FF", color:p.status==="着金"?DS.emerald:DS.indigo, fontWeight:500 }}>{p.status}</span>
                      </td>
                      <td style={{ padding:"8px 10px", fontSize:12, color:DS.text2 }}>{p.date}</td>
                      <td style={{ padding:"8px 10px", fontSize:12 }}>{p.assigned}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── セクション4: 営業マン成績 ── */}
            <div style={{ fontSize:12, color:DS.text2, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>営業マン別成績</div>
            <div style={{ background:DS.card, border:`1px solid ${DS.border}`, borderRadius:DS.radius, padding:"1.25rem", marginBottom:"1.75rem" }}>
              <table style={{ width:"100%", fontSize:13, borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${DS.border}`, background:DS.beige }}>
                    {["順位","担当者","友達追加","進行中","契約済み","失注","契約率","今月売上","返信速度","返信率"].map(h=>(
                      <th key={h} style={{ padding:"9px 12px", textAlign:"left", fontSize:11, color:DS.text2, fontWeight:500, whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...team].sort((a,b)=>(b.monthlyRate[b.monthlyRate.length-1]||0)-(a.monthlyRate[a.monthlyRate.length-1]||0)).map((m,i)=>{
                    const mine=mc.filter(c=>c.assigned===m.name);
                    const myActive=mine.filter(c=>!["失注（離脱中・シナリオ配信中）","AD着金済み","契約済み"].includes(c.status)).length;
                    const myContracted=mine.filter(c=>CONTRACTED_STATUSES.has(c.status)).length;
                    const myLost=mine.filter(c=>c.status==="失注（離脱中・シナリオ配信中）").length;
                    const rate=(m.monthlyRate[m.monthlyRate.length-1]||0);
                    return (
                      <tr key={m.name} style={{ borderBottom:`1px solid ${DS.border}` }}>
                        <td style={{ padding:"10px 12px", fontWeight:500 }}>{`${i+1}位`}</td>
                        <td style={{ padding:"10px 12px" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <div style={{ width:30, height:30, borderRadius:"50%", background:m.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, color:m.color }}>{displayStaffName(m.name)[0]}</div>
                            <span style={{ fontWeight:500 }}>{displayStaffName(m.name)}</span>
                          </div>
                        </td>
                        <td style={{ padding:"10px 12px" }}>{mine.length}名</td>
                        <td style={{ padding:"10px 12px", color:DS.indigo }}>{myActive}件</td>
                        <td style={{ padding:"10px 12px", color:DS.emerald, fontWeight:500 }}>{myContracted}件</td>
                        <td style={{ padding:"10px 12px", color:DS.rose }}>{myLost}件</td>
                        <td style={{ padding:"10px 12px" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <div style={{ width:60, height:7, background:DS.beige, borderRadius:3, overflow:"hidden" }}>
                              <div style={{ width:`${Math.min(Math.round((rate/50)*100),100)}%`, height:"100%", background:rate>=35?DS.emerald:rate>=25?DS.indigo:DS.rose, borderRadius:3 }}/>
                            </div>
                            <span style={{ fontWeight:500, color:rate>=35?DS.emerald:rate>=25?DS.indigo:DS.rose }}>{rate.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td style={{ padding:"10px 12px", fontWeight:500 }}>{calcContractRevenue(mine).toLocaleString()}円</td>
                        <td style={{ padding:"10px 12px" }}>
                          <span style={{ fontSize:12, color:m.avgReply>20?DS.rose:DS.emerald, fontWeight:500 }}>{m.avgReply}分 {m.avgReply>20?"":" "}</span>
                        </td>
                        <td style={{ padding:"10px 12px" }}>
                          <span style={{ fontSize:12, color:m.replyRate<85?DS.rose:DS.emerald, fontWeight:500 }}>{m.replyRate}% {m.replyRate<85?"":" "}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── セクション5: 今月の顧客一覧 ── */}
            <div style={{ fontSize:12, color:DS.text2, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>今月の全顧客一覧</div>
            <div style={{ background:DS.card, border:`1px solid ${DS.border}`, borderRadius:DS.radius, overflow:"hidden" }}>
              <table style={{ width:"100%", fontSize:13, borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${DS.border}`, background:DS.beige }}>
                    {["顧客名","案件名","担当者","進捗","契約見込み金","着金予定日"].map(h=>(
                      <th key={h} style={{ padding:"9px 12px", textAlign:"left", fontSize:11, color:DS.text2, fontWeight:500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mc.map((c,i)=>{
                    const estimate=(c.commission||0)+(c.ad||0)+(c.otherRevenue||0);
                    const st=STATUS_STYLE[c.status]||{bg:DS.border,text:"#64748B"};
                    return (
                      <tr key={c.id} style={{ borderBottom:`1px solid ${DS.border}`, background:i%2===0?"transparent":DS.hover }}>
                        <td style={{ padding:"9px 12px", fontWeight:500 }}>{c.name}</td>
                        <td style={{ padding:"9px 12px", color:DS.text2 }}>{c.caseName||"−"}</td>
                        <td style={{ padding:"9px 12px" }}>{c.assigned}</td>
                        <td style={{ padding:"9px 12px" }}><span style={{ fontSize:11, padding:"3px 8px", borderRadius:4, background:st.bg, color:st.text, fontWeight:500 }}>{c.status}</span></td>
                        <td style={{ padding:"9px 12px", fontWeight:500 }}>{estimate>0?`${estimate.toLocaleString()}円`:"0円"}</td>
                        <td style={{ padding:"9px 12px", fontSize:12, color:DS.text2 }}>{c.paymentDate||"−"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── セクション6: 年間見込み ── */}
            <div style={{ fontSize:12, color:DS.text2, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10, marginTop:"1.75rem" }}>年間見込み（2026年）</div>
            <div style={{ background:DS.card, border:`1px solid ${DS.border}`, borderRadius:DS.radius, padding:"1.25rem" }}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:16 }}>
                <div style={{ background:"#FEF3C7", borderRadius:DS.radiusSm, padding:"1rem 1.25rem" }}>
                  <div style={{ fontSize:12, color:DS.amber, marginBottom:4 }}>年間売上見込み（契約ベース）</div>
                  <div style={{ fontSize:28, fontWeight:500, color:DS.amber, fontVariantNumeric:"tabular-nums" }}>{(totalEstimate*12).toLocaleString()}円</div>
                  <div style={{ fontSize:11, color:DS.amber, opacity:0.7, marginTop:4 }}>今月契約ベース × 12ヶ月で算出</div>
                </div>
                <div style={{ background:"#D1FAE5", borderRadius:DS.radiusSm, padding:"1rem 1.25rem" }}>
                  <div style={{ fontSize:12, color:DS.emerald, marginBottom:4 }}>年間着金見込み</div>
                  <div style={{ fontSize:28, fontWeight:500, color:DS.emerald, fontVariantNumeric:"tabular-nums" }}>{(calcPaidRevenue(mc)*12).toLocaleString()}円</div>
                  <div style={{ fontSize:11, color:DS.emerald, opacity:0.7, marginTop:4 }}>今月着金ベース × 12ヶ月で算出</div>
                </div>
                <div style={{ background:"#EEF2FF", borderRadius:DS.radiusSm, padding:"1rem 1.25rem" }}>
                  <div style={{ fontSize:12, color:DS.indigo, marginBottom:4 }}>年間契約見込み</div>
                  <div style={{ fontSize:28, fontWeight:500, color:DS.indigo, fontVariantNumeric:"tabular-nums" }}>{contractedInMonth(selectedMonth) * 12}件</div>
                  <div style={{ fontSize:11, color:DS.indigo, opacity:0.7, marginTop:4 }}>今月契約実績 × 12ヶ月で算出</div>
                </div>
              </div>
              <div style={{ fontSize:11, color:DS.text2 }}>※ 現時点の実績をもとにした概算です。月が進むにつれ精度が上がります。</div>
            </div>

            {/* ── セクション7: 月別比較テーブル ── */}
            <div style={{ fontSize:12, color:DS.text2, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10, marginTop:"1.75rem" }}>月別比較（直近{summaryRange}ヶ月）</div>
            <div style={{ background:DS.card, border:`1px solid ${DS.border}`, borderRadius:DS.radius, overflow:"hidden" }}>
              <table style={{ width:"100%", fontSize:13, borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${DS.border}`, background:DS.beige }}>
                    {["月","友達追加","契約数","売上","契約率","失注数"].map(h=>(
                      <th key={h} style={{ padding:"9px 12px", textAlign:"left", fontSize:11, color:DS.text2, fontWeight:500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(()=>{
                    const rows = [];
                    for (let i = 0; i < summaryRange; i++) {
                      const m = CURRENT_MONTH - i;
                      const y = m <= 0 ? CURRENT_YEAR - 1 : CURRENT_YEAR;
                      const mm = m <= 0 ? m + 12 : m;
                      const key = `${y}/${String(mm).padStart(2,"0")}`;
                      const mCust = customers.filter(c => c.addedDate && c.addedDate.substring(0,7).replace("-","/") === key);
                      const mContracted = mCust.filter(c => CONTRACTED_STATUSES.has(c.status)).length;
                      const mLost = mCust.filter(c => c.status === "失注（離脱中・シナリオ配信中）").length;
                      const mRevenue = calcContractRevenue(mCust);
                      const mRate = mCust.length > 0 ? Math.round((mContracted / mCust.length) * 100) : 0;
                      const isCurrent = i === 0;
                      rows.push(
                        <tr key={key} style={{ borderBottom:`1px solid ${DS.border}`, background:isCurrent?DS.hover:"transparent" }}>
                          <td style={{ padding:"9px 12px", fontWeight:isCurrent?600:400 }}>{mm}月 {isCurrent && <span style={{ fontSize:10, color:DS.teal, background:"#F0FDFA", padding:"1px 5px", borderRadius:3, marginLeft:4 }}>今月</span>}</td>
                          <td style={{ padding:"9px 12px", fontVariantNumeric:"tabular-nums" }}>{mCust.length}名</td>
                          <td style={{ padding:"9px 12px", color:DS.emerald, fontWeight:500, fontVariantNumeric:"tabular-nums" }}>{mContracted}件</td>
                          <td style={{ padding:"9px 12px", fontWeight:500, fontVariantNumeric:"tabular-nums" }}>¥{mRevenue.toLocaleString()}</td>
                          <td style={{ padding:"9px 12px" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                              <div style={{ width:50, height:7, background:DS.beige, borderRadius:3, overflow:"hidden" }}>
                                <div style={{ width:`${mRate}%`, height:"100%", background:mRate>=40?DS.emerald:mRate>=25?DS.indigo:DS.rose, borderRadius:3 }}/>
                              </div>
                              <span style={{ fontWeight:500, color:mRate>=40?DS.emerald:mRate>=25?DS.indigo:DS.rose, fontVariantNumeric:"tabular-nums" }}>{mRate}%</span>
                            </div>
                          </td>
                          <td style={{ padding:"9px 12px", color:DS.rose, fontVariantNumeric:"tabular-nums" }}>{mLost}件</td>
                        </tr>
                      );
                    }
                    return rows;
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* ===== 顧客管理 ===== */}
      {tab==="customers" && (()=>{
        // 進行中ステータス（新KPI定義）
        const IN_PROGRESS_STATUSES = ["物件提案中","内見","審査中","審査通過済み（契約準備中）"];
        // KPI用の母集団: 担当者フィルターのみ適用（月フィルターは各KPIで個別に適用）
        const kpiPool = selectedStaff === "全員" ? customers : customers.filter(c=>c.assigned===selectedStaff);
        // 日付(YYYY-MM-DD or YYYY/MM/DD)を selectedMonth (YYYY/MM) と比較
        const matchesSelectedMonth = (dateStr) => {
          if (!dateStr) return false;
          return String(dateStr).substring(0,7).replace("-","/") === selectedMonth;
        };
        // その月に友達追加された顧客（かつ名前あり = ゴースト/未同期を除外）
        const kpiAddedInMonth = kpiPool.filter(c =>
          c.name && String(c.name).trim() !== "" && matchesSelectedMonth(c.addedDate)
        );
        const kpiTotal       = kpiAddedInMonth.length;
        const kpiInProgress  = kpiAddedInMonth.filter(c=>IN_PROGRESS_STATUSES.includes(c.status)).length;
        const kpiProspect    = calcProspectRevenue(kpiAddedInMonth);
        // 入金済み: その月に着金実績日(AM/AN/AO)が入っている額の合計
        const kpiReceived = kpiPool.reduce((sum, c) => {
          let s = 0;
          if (matchesSelectedMonth(c.feeReceivedDate))          s += Number(c.commission)   || 0;
          if (matchesSelectedMonth(c.adReceivedDate))           s += Number(c.ad)           || 0;
          if (matchesSelectedMonth(c.otherRevenueReceivedDate)) s += Number(c.otherRevenue) || 0;
          return sum + s;
        }, 0);
        const kpiLost = kpiAddedInMonth.filter(c=>c.status==="失注（離脱中・シナリオ配信中）").length;

        // AD/その他売上の未入力判定（空文字 = 注意喚起、"0" や金額 = 確定）
        const isUnconfirmed = (raw) => raw === undefined || raw === null || String(raw).trim() === "";

        // 注意喚起アイコン
        const AlertUnconfirmed = () => (
          <span title="未確認です。0と入力すると確定します" style={{ display:"inline-flex", marginLeft:2, verticalAlign:"middle", cursor:"help" }}>
            <AlertCircle size={12} strokeWidth={1.8} color="#F59E0B" style={{ opacity:0.85 }}/>
          </span>
        );

        return (
        <div>
          {/* 担当者セグメントコントロール */}
          <div style={{ display:"flex", alignItems:"center", gap:1, background:"#F1F5F9", borderRadius:8, padding:"3px", marginBottom:16 }}>
            {["全員",...STAFF.filter(s=>s!=="対応者不明")].map(name=>{
              const isActive = selectedStaff === name;
              const count = name === "全員" ? customers.length : customers.filter(c=>c.assigned===name).length;
              return (
                <button key={name} onClick={()=>setSelectedStaff(name)} style={{
                  fontSize:12, fontWeight:isActive?600:400, padding:"5px 12px", borderRadius:6,
                  border:"none", cursor:"pointer", userSelect:"none",
                  background:isActive?"#fff":"transparent",
                  color:isActive?DS.teal:"#475569",
                  boxShadow:isActive?"0 1px 3px rgba(0,0,0,0.08)":"none",
                  transition:"all 0.2s",
                }}>
                  {name === "全員" ? name : displayStaffName(name)}<span style={{ fontSize:10, marginLeft:3, opacity:0.7 }}>({count})</span>
                </button>
              );
            })}
          </div>

          {/* 上部KPI 5つ */}
          <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:"1.5rem" }}>
            {[
              { label:"総顧客数",     value:`${kpiTotal}名` },
              { label:"進行中",       value:`${kpiInProgress}件` },
              { label:"契約見込み金", value:`${kpiProspect.toLocaleString()}円` },
              { label:"入金済み",     value:`${kpiReceived.toLocaleString()}円` },
              { label:"失注",         value:`${kpiLost}件` },
            ].map(c=>(
              <div key={c.label} style={{ background:DS.beige, borderRadius:DS.radiusSm, padding:"1rem 1.25rem", flex:1, minWidth:110 }}>
                <div style={{ fontSize:12, color:DS.text2, marginBottom:4 }}>{c.label}</div>
                <div style={{ fontSize:22, fontWeight:500, fontVariantNumeric:"tabular-nums" }}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* コホート分析（横長ボックス） */}
          {(()=>{
            // cohortMonth は YYYY/MM 形式。その月に友達追加された顧客のみで集計
            const cohortCustomers = customers.filter(c=>{
              const d = c.addedDate || "";
              const m = d ? d.substring(0,7).replace("-","/") : "";
              return m === cohortMonth;
            });
            const cohortAdded = cohortCustomers.length;
            const cohortContracted = cohortCustomers.filter(c=>CONTRACTED_STATUSES.has(c.status)).length;
            const cohortRevenue = calcPaidRevenue(cohortCustomers);
            const cohortLost = cohortCustomers.filter(c=>c.status==="失注（離脱中・シナリオ配信中）").length;
            const cohortLostRate = cohortAdded > 0 ? Math.round((cohortLost/cohortAdded)*100) : 0;

            // 月オプション：customersから抽出 + 今月
            const availableMonths = Array.from(new Set(
              customers.map(c=>{ const d=c.addedDate||""; return d?d.substring(0,7).replace("-","/"):""; }).filter(Boolean)
            ));
            if (!availableMonths.includes(`${CURRENT_YEAR}/${String(CURRENT_MONTH).padStart(2,"0")}`)) {
              availableMonths.push(`${CURRENT_YEAR}/${String(CURRENT_MONTH).padStart(2,"0")}`);
            }
            availableMonths.sort().reverse();

            // パイプライン形式の人数カウント（ステータスごと）
            const pipelineRows = [...PIPELINE_ORDER, "失注（離脱中・シナリオ配信中）"].map(st=>({
              stage: st,
              count: cohortCustomers.filter(c=>c.status===st).length,
            }));
            const maxCount = Math.max(1, ...pipelineRows.map(r=>r.count));

            return (
              <div style={{ background:DS.card, border:`1px solid ${DS.border}`, borderRadius:DS.radius, padding:"20px", marginBottom:16 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14, flexWrap:"wrap" }}>
                  <div style={{ fontSize:14, fontWeight:700 }}>コホート分析</div>
                  <div style={{ fontSize:11, color:DS.text2 }}>指定月に友達追加された顧客の追跡</div>
                  <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:11, color:DS.text2 }}>対象月</span>
                    <select value={cohortMonth} onChange={e=>setCohortMonth(e.target.value)} style={{ fontSize:12, padding:"5px 10px", borderRadius:6, border:`1px solid ${DS.border}`, background:DS.beige, color:DS.text1 }}>
                      {availableMonths.map(m=><option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                {/* サマリー4指標 */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12, marginBottom:16 }}>
                  <div style={{ background:DS.beige, borderRadius:DS.radiusSm, padding:"10px 14px" }}>
                    <div style={{ fontSize:11, color:DS.text2, marginBottom:4 }}>友達追加数</div>
                    <div style={{ fontSize:20, fontWeight:600, fontVariantNumeric:"tabular-nums" }}>{cohortAdded}<span style={{ fontSize:11, color:DS.text2, marginLeft:3 }}>名</span></div>
                  </div>
                  <div style={{ background:DS.beige, borderRadius:DS.radiusSm, padding:"10px 14px" }}>
                    <div style={{ fontSize:11, color:DS.text2, marginBottom:4 }}>契約数</div>
                    <div style={{ fontSize:20, fontWeight:600, color:DS.emerald, fontVariantNumeric:"tabular-nums" }}>{cohortContracted}<span style={{ fontSize:11, color:DS.text2, marginLeft:3 }}>件</span></div>
                  </div>
                  <div style={{ background:DS.beige, borderRadius:DS.radiusSm, padding:"10px 14px" }}>
                    <div style={{ fontSize:11, color:DS.text2, marginBottom:4 }}>成約ベース売上</div>
                    <div style={{ fontSize:18, fontWeight:600, color:DS.indigo, fontVariantNumeric:"tabular-nums" }}>¥{cohortRevenue.toLocaleString()}</div>
                  </div>
                  <div style={{ background:DS.beige, borderRadius:DS.radiusSm, padding:"10px 14px" }}>
                    <div style={{ fontSize:11, color:DS.text2, marginBottom:4 }}>失注数（離脱率）</div>
                    <div style={{ fontSize:20, fontWeight:600, color:DS.rose, fontVariantNumeric:"tabular-nums" }}>{cohortLost}<span style={{ fontSize:11, color:DS.text2, marginLeft:4 }}>件</span><span style={{ fontSize:12, color:DS.rose, marginLeft:6 }}>({cohortLostRate}%)</span></div>
                  </div>
                </div>

                {/* パイプライン形式 横棒グラフ */}
                <div style={{ fontSize:11, color:DS.text2, marginBottom:8 }}>ステータス別内訳（人数に比例した横棒）</div>
                <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                  {pipelineRows.map(r=>{
                    const st = STATUS_STYLE[r.stage] || { bg:DS.border, text:"#64748B" };
                    const w = r.count > 0 ? Math.max(4, Math.round((r.count/maxCount)*100)) : 0;
                    return (
                      <div key={r.stage} style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ width:130, fontSize:11, color:DS.text2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.stage}</div>
                        <div style={{ flex:1, height:18, background:DS.hover, borderRadius:4, overflow:"hidden", position:"relative" }}>
                          <div style={{ width:`${w}%`, height:"100%", background:st.text, opacity:0.85, borderRadius:4, transition:"width 0.3s" }}/>
                          {r.count > 0 && (
                            <span style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)", fontSize:10, fontWeight:600, color:"#fff" }}>{r.count}人</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {cohortAdded === 0 && (
                  <div style={{ fontSize:11, color:DS.text3, textAlign:"center", padding:"12px 0" }}>{cohortMonth} に友達追加された顧客はいません</div>
                )}
              </div>
            );
          })()}

          {/* フィルター */}
          <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
            <div style={{ position:"relative" }}>
              <Search size={14} strokeWidth={1.5} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:DS.text3 }}/>
              <input value={searchText} onChange={e=>setSearchText(e.target.value)} placeholder="顧客名・案件名で検索" style={{ fontSize:13, padding:"7px 12px 7px 30px", borderRadius:6, border:`1px solid ${DS.border}`, background:DS.beige, color:DS.text1, width:200 }}/>
            </div>
            <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{ fontSize:13, padding:"7px 10px", borderRadius:6, border:`1px solid ${DS.border}`, background:DS.beige, color:DS.text1 }}>
              {["全て",...STATUSES].map(s=><option key={s}>{s}</option>)}
            </select>
            <Btn onClick={()=>setShowAllCustomers(v=>!v)}>
              {showAllCustomers ? "新着20人に戻る" : "全顧客を表示"}
            </Btn>
            <div style={{ marginLeft:"auto" }}>
              <Btn onClick={()=>setModal({type:"customer",data:{}})} variant="primary">＋ 顧客追加</Btn>
            </div>
          </div>

          {/* テーブル */}
          <div style={{ background:DS.card, border:`1px solid ${DS.border}`, borderRadius:DS.radius, overflow:"hidden" }}>
            <div style={{ overflowX:"auto" }}>
              <table style={{ fontSize:12, borderCollapse:"collapse", minWidth:2600, width:"100%" }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${DS.border}`, background:DS.beige }}>
                    {[
                      {label:"顧客名", w:110},
                      {label:"担当者", w:95, edit:true},
                      {label:"ステータス", w:130, edit:true},
                      {label:"案件名", w:150, edit:true},
                      {label:"仲介手数料", w:100, edit:true},
                      {label:"AD", w:100, edit:true},
                      {label:"その他売上", w:110, edit:true},
                      {label:"仲介着金日", w:120, edit:true},
                      {label:"AD着金日", w:120, edit:true},
                      {label:"他売上着金日", w:130, edit:true},
                      {label:"友達追加日", w:105},
                      {label:"入居時期", w:90},
                      {label:"希望エリア", w:110},
                      {label:"希望家賃", w:95},
                      {label:"初期費用予算", w:110},
                      {label:"希望間取り", w:95},
                      {label:"駅徒歩", w:75},
                      {label:"必須条件", w:130},
                      {label:"入居予定人数", w:95},
                      {label:"年収", w:95},
                      {label:"身分証", w:90},
                      {label:"返済状況", w:95},
                      {label:"滞納期間", w:95},
                      {label:"保証会社", w:110},
                      {label:"流入経路", w:100},
                      {label:"アンケート", w:80},
                    ].map(h=>(
                      <th key={h.label} style={{ padding:"9px 8px", textAlign:"left", fontSize:11, color:h.edit?DS.teal:DS.text2, fontWeight:500, whiteSpace:"nowrap", minWidth:h.w }}>
                        {h.edit && <span style={{ marginRight:3, color:DS.teal }}>✎</span>}{h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customerTabDisplay.map((c)=>{
                    const st = STATUS_STYLE[c.status] || { bg:DS.border, text:"#64748B" };
                    const adEmpty = isUnconfirmed(c.adRaw);
                    const otherEmpty = isUnconfirmed(c.otherRevenueRaw);
                    const surveyDone = !!c.initialSurvey;
                    const formDone = !!c.propertyForm;
                    return (
                      <tr key={c.id} style={{ borderBottom:`1px solid ${DS.border}` }}>
                        {/* 顧客名 */}
                        <td style={{ padding:"9px 8px", fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.name}</td>
                        {/* 担当者 */}
                        <td style={{ padding:"6px 6px" }}>
                          <select value={c.assigned} onChange={e=>{ updateField(c.id,"assigned",e.target.value); showToast("担当者を変更しました"); }} style={{ fontSize:11, padding:"4px 4px", borderRadius:4, border:`1px solid ${DS.border}`, background:DS.beige, color:DS.text1, width:"100%", boxSizing:"border-box" }}>
                            {STAFF.map(s=><option key={s} value={s}>{displayStaffName(s)}</option>)}
                          </select>
                        </td>
                        {/* ステータス（色付き背景で瞬時判別） */}
                        <td style={{ padding:"6px 6px" }}>
                          <select value={c.status} onChange={e=>{ updateField(c.id,"status",e.target.value); showToast("ステータスを更新しました"); }} style={{ fontSize:11, padding:"5px 6px", borderRadius:4, border:"none", background:st.bg, color:st.text, fontWeight:600, cursor:"pointer", width:"100%", boxSizing:"border-box" }}>
                            {STATUSES.map(s=><option key={s}>{s}</option>)}
                          </select>
                        </td>
                        {/* 案件名 */}
                        <td style={{ padding:"4px 6px" }}>
                          <input value={c.caseName||""} onChange={e=>updateField(c.id,"caseName",e.target.value)} placeholder="—" style={{ fontSize:11, padding:"4px 6px", borderRadius:4, border:`1px solid transparent`, background:"transparent", color:DS.text1, width:"100%", boxSizing:"border-box" }} onFocus={e=>{e.target.style.borderColor=DS.teal;e.target.style.background="#fff";}} onBlur={e=>{e.target.style.borderColor="transparent";e.target.style.background="transparent";showToast("案件名を更新しました");}}/>
                        </td>
                        {/* 仲介手数料 */}
                        <td style={{ padding:"4px 6px" }}>
                          <input value={c.commission||""} onChange={e=>updateField(c.id,"commission",e.target.value)} placeholder="—" style={{ fontSize:11, padding:"4px 6px", borderRadius:4, border:`1px solid transparent`, background:"transparent", color:DS.text1, width:"100%", boxSizing:"border-box" }} onFocus={e=>{e.target.style.borderColor=DS.teal;e.target.style.background="#fff";}} onBlur={e=>{e.target.style.borderColor="transparent";e.target.style.background="transparent";showToast("仲介手数料を更新しました");}}/>
                        </td>
                        {/* AD + 注意喚起 */}
                        <td style={{ padding:"4px 6px", background:adEmpty?"#FFFBEB":"transparent" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:2 }}>
                            <input value={c.ad||""} onChange={e=>updateField(c.id,"ad",e.target.value)} placeholder="未確認" style={{ fontSize:11, padding:"4px 6px", borderRadius:4, border:`1px solid transparent`, background:"transparent", color:DS.text1, width:"100%", boxSizing:"border-box" }} onFocus={e=>{e.target.style.borderColor=DS.teal;e.target.style.background="#fff";}} onBlur={e=>{e.target.style.borderColor="transparent";e.target.style.background="transparent";showToast("ADを更新しました");}}/>
                            {adEmpty && <AlertUnconfirmed/>}
                          </div>
                        </td>
                        {/* その他売上 + 注意喚起 */}
                        <td style={{ padding:"4px 6px", background:otherEmpty?"#FFFBEB":"transparent" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:2 }}>
                            <input value={c.otherRevenue||""} onChange={e=>updateField(c.id,"otherRevenue",e.target.value)} placeholder="未確認" style={{ fontSize:11, padding:"4px 6px", borderRadius:4, border:`1px solid transparent`, background:"transparent", color:DS.text1, width:"100%", boxSizing:"border-box" }} onFocus={e=>{e.target.style.borderColor=DS.teal;e.target.style.background="#fff";}} onBlur={e=>{e.target.style.borderColor="transparent";e.target.style.background="transparent";showToast("その他売上を更新しました");}}/>
                            {otherEmpty && <AlertUnconfirmed/>}
                          </div>
                        </td>
                        {/* 着金実績日 3つ */}
                        <td style={{ padding:"4px 6px" }}>
                          <input type="date" value={c.feeReceivedDate?String(c.feeReceivedDate).replace(/\//g,"-").substring(0,10):""} onChange={e=>{ updateField(c.id,"feeReceivedDate",e.target.value); showToast("仲介着金日を更新しました"); }} style={{ fontSize:10, padding:"4px 4px", borderRadius:4, border:`1px solid ${DS.border}`, background:DS.beige, color:DS.text1, width:"100%", boxSizing:"border-box" }}/>
                        </td>
                        <td style={{ padding:"4px 6px" }}>
                          <input type="date" value={c.adReceivedDate?String(c.adReceivedDate).replace(/\//g,"-").substring(0,10):""} onChange={e=>{ updateField(c.id,"adReceivedDate",e.target.value); showToast("AD着金日を更新しました"); }} style={{ fontSize:10, padding:"4px 4px", borderRadius:4, border:`1px solid ${DS.border}`, background:DS.beige, color:DS.text1, width:"100%", boxSizing:"border-box" }}/>
                        </td>
                        <td style={{ padding:"4px 6px" }}>
                          <input type="date" value={c.otherRevenueReceivedDate?String(c.otherRevenueReceivedDate).replace(/\//g,"-").substring(0,10):""} onChange={e=>{ updateField(c.id,"otherRevenueReceivedDate",e.target.value); showToast("他売上着金日を更新しました"); }} style={{ fontSize:10, padding:"4px 4px", borderRadius:4, border:`1px solid ${DS.border}`, background:DS.beige, color:DS.text1, width:"100%", boxSizing:"border-box" }}/>
                        </td>
                        {/* 読み取り専用項目 */}
                        <td style={{ padding:"9px 8px", fontSize:11, color:DS.text2, whiteSpace:"nowrap" }}>{c.addedDate||"—"}</td>
                        <td style={{ padding:"9px 8px", fontSize:11, whiteSpace:"nowrap" }}>{c.moveInTiming||"—"}</td>
                        <td style={{ padding:"9px 8px", fontSize:11, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }} title={c.desiredArea||""}>{c.desiredArea||"—"}</td>
                        <td style={{ padding:"9px 8px", fontSize:11, whiteSpace:"nowrap" }}>{c.desiredRent||"—"}</td>
                        <td style={{ padding:"9px 8px", fontSize:11, whiteSpace:"nowrap" }}>{c.initialBudget||"—"}</td>
                        <td style={{ padding:"9px 8px", fontSize:11, whiteSpace:"nowrap" }}>{c.desiredLayout||"—"}</td>
                        <td style={{ padding:"9px 8px", fontSize:11, whiteSpace:"nowrap" }}>{c.walkMinutes||"—"}</td>
                        <td style={{ padding:"9px 8px", fontSize:11, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }} title={c.mustConditions||""}>{c.mustConditions||"—"}</td>
                        <td style={{ padding:"9px 8px", fontSize:11, whiteSpace:"nowrap" }}>{c.numResidents||"—"}</td>
                        <td style={{ padding:"9px 8px", fontSize:11, whiteSpace:"nowrap" }}>{c.annualIncome||"—"}</td>
                        <td style={{ padding:"9px 8px", fontSize:11, whiteSpace:"nowrap" }}>{c.idDocument||"—"}</td>
                        <td style={{ padding:"9px 8px", fontSize:11, whiteSpace:"nowrap" }}>{c.repaymentStatus||"—"}</td>
                        <td style={{ padding:"9px 8px", fontSize:11, whiteSpace:"nowrap" }} title={`家賃:${c.arrearsRent||"−"} カード:${c.arrearsCard||"−"}`}>
                          {(c.arrearsRent||c.arrearsCard) ? `${c.arrearsRent||"−"}/${c.arrearsCard||"−"}` : "—"}
                        </td>
                        <td style={{ padding:"9px 8px", fontSize:11, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }} title={c.guaranteeCompany||""}>{c.guaranteeCompany||"—"}</td>
                        <td style={{ padding:"9px 8px", fontSize:11, whiteSpace:"nowrap", color:DS.text3 }}>—</td>
                        <td style={{ padding:"4px 8px", textAlign:"center" }}>
                          <span style={{ fontSize:10, padding:"2px 6px", borderRadius:10, background:surveyDone?"#D1FAE5":"#FEF3C7", color:surveyDone?DS.emerald:DS.amber, fontWeight:500 }}>
                            {surveyDone && formDone ? "済" : (surveyDone||formDone) ? "一部" : "未"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {customerTabDisplay.length===0 && <div style={{ padding:"2rem", textAlign:"center", color:DS.text2, fontSize:13 }}>該当する顧客が見つかりません</div>}
          </div>
          <div style={{ fontSize:11, color:DS.text2, marginTop:8 }}>
            {showAllCustomers
              ? `${customerTabDisplay.length}件表示 / 全${customerTabAll.length}件`
              : `新着${customerTabDisplay.length}件を表示中 / 全${customerTabAll.length}件（「全顧客を表示」で全件表示）`}
            　※✎マーク列は直接編集可能
          </div>
        </div>
        );
      })()}

      {/* ===== パイプライン ===== */}
      {tab==="pipeline" && (()=>{
        // 友達追加→契約までの総リードタイム計算
        const contractedCustomers = mc.filter(c=>CONTRACTED_STATUSES.has(c.status) && c.addedDate && c.leadTimes?.length>0);
        const avgContractLead = contractedCustomers.length
          ? Math.round(contractedCustomers.reduce((s,c)=>{ const total=c.leadTimes.reduce((a,l)=>a+l.hours,0); return s+total; },0) / contractedCustomers.length)
          : 0;

        // ステージ間の平均リードタイム
        const stagePairs = [
          ["未対応","物件提案中"],["物件提案中","内見"],["内見","審査中"],["審査中","審査通過済み（契約準備中）"],["審査通過済み（契約準備中）","契約済み"]
        ];
        const avgByStage = stagePairs.map(([from,to])=>{
          const times = mc.flatMap(c=>(c.leadTimes||[]).filter(l=>l.from===from&&l.to===to).map(l=>l.hours));
          return { from, to, avg: times.length ? Math.round(times.reduce((a,b)=>a+b,0)/times.length) : null, count: times.length };
        });

        return (
          <div>
            {/* ── 上段: ドーナツ ＋ 友達追加→契約リードタイム ── */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>

              {/* ドーナツ */}
              <div style={{ background:DS.card, border:`1px solid ${DS.border}`, borderRadius:DS.radius, padding:"1.25rem" }}>
                <div style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>進捗別件数</div>
                <div style={{ display:"flex", gap:16, alignItems:"center" }}>
                  <div style={{ position:"relative", width:160, height:160, flexShrink:0 }}>
                    <canvas ref={pipelineChartRef}/>
                    <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", textAlign:"center", pointerEvents:"none" }}>
                      <div style={{ fontSize:10, color:DS.text2 }}>合計</div>
                      <div style={{ fontSize:20, fontWeight:500 }}>{mc.length}件</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:7, flex:1 }}>
                    {STATUSES.map(s=>{
                      const count=mc.filter(c=>c.status===s).length;
                      const pct=mc.length?Math.round((count/mc.length)*100):0;
                      const st=STATUS_STYLE[s];
                      return (
                        <div key={s} style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ width:10, height:10, borderRadius:2, background:st.text, display:"inline-block", flexShrink:0, opacity:0.85 }}/>
                          <span style={{ fontSize:12, flex:1 }}>{s}</span>
                          <span style={{ fontSize:12, fontWeight:500 }}>{count}件</span>
                          <span style={{ fontSize:11, color:DS.text2, minWidth:28, textAlign:"right" }}>{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 友達追加→契約リードタイム */}
              <div style={{ background:DS.card, border:`1px solid ${DS.border}`, borderRadius:DS.radius, padding:"1.25rem" }}>
                <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>友達追加 → 契約までのリードタイム</div>
                <div style={{ fontSize:11, color:DS.text2, marginBottom:16 }}>契約済み・AD着金済み顧客の平均値</div>
                <div style={{ fontSize:48, fontWeight:500, color:DS.indigo, lineHeight:1, marginBottom:6 }}>
                  {avgContractLead}<span style={{ fontSize:18 }}>時間</span>
                </div>
                <div style={{ fontSize:12, color:DS.text2, marginBottom:16 }}>≈ 約{Math.round(avgContractLead/24)}日</div>

                {/* ステージ別内訳 */}
                <div style={{ fontSize:11, color:DS.text2, marginBottom:8 }}>ステージ間の平均所要時間</div>
                {avgByStage.map((s,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:4, flex:1, fontSize:11 }}>
                      <span style={{ color:DS.text2 }}>{s.from}</span>
                      <span style={{ color:DS.text2 }}>→</span>
                      <span style={{ fontWeight:500 }}>{s.to}</span>
                    </div>
                    <span style={{ fontSize:12, fontWeight:500, color:DS.indigo, minWidth:55, textAlign:"right" }}>
                      {s.avg!==null ? `${s.avg}時間` : "−"}
                    </span>
                    <span style={{ fontSize:11, color:DS.text2, minWidth:30 }}>
                      {s.count>0?`(${s.count}件)`:""}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ステージ移行率（カンバンボード風） */}
            <div style={{ background:DS.card, border:`1px solid ${DS.border}`, borderRadius:DS.radius, padding:"1.25rem", marginBottom:20 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                <GitBranch size={16} strokeWidth={1.5} color={DS.indigo}/>
                <span style={{ fontSize:14, fontWeight:700 }}>ステージ移行率</span>
              </div>
              <div style={{ fontSize:11, color:DS.text2, marginBottom:20 }}>各ステージの件数・次ステージへの移行率・失注への分岐</div>
              {(()=>{
                const stages = PIPELINE_ORDER.map(stage=>{
                  const count = mc.filter(c=>c.status===stage).length;
                  return { stage, count };
                });
                const totalLost = mc.filter(c=>c.status==="失注（離脱中・シナリオ配信中）").length;
                return (
                  <div style={{ overflowX:"auto", paddingBottom:8 }}>
                    <div style={{ display:"flex", alignItems:"stretch", gap:0, minWidth:stages.length*180 }}>
                      {stages.map((s,i)=>{
                        const st = STATUS_STYLE[s.stage] || { bg:DS.border, text:"#64748B" };
                        const nextCount = i < stages.length-1 ? stages[i+1].count : null;
                        const convRate  = s.count > 0 && nextCount !== null ? Math.round((nextCount / s.count) * 100) : null;
                        const dropoff   = s.count > 0 && nextCount !== null ? Math.max(s.count - nextCount, 0) : null;
                        const convColor = convRate === null ? DS.text2 : convRate >= 60 ? DS.emerald : convRate >= 40 ? DS.amber : DS.rose;
                        return (
                          <div key={s.stage} style={{ display:"flex", alignItems:"stretch" }}>
                            {/* ステージカード */}
                            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", minWidth:140 }}>
                              <div style={{
                                width:140, minHeight:130,
                                background:st.bg,
                                border:`2px solid ${st.text}22`,
                                borderTop:`4px solid ${st.text}`,
                                borderRadius:DS.radius,
                                padding:"14px 10px",
                                display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"space-between", gap:10,
                                textAlign:"center",
                                boxShadow:"0 1px 3px rgba(15,23,42,0.06)",
                                boxSizing:"border-box",
                              }}>
                                <div style={{ fontSize:11, fontWeight:700, color:st.text, lineHeight:1.3, wordBreak:"keep-all" }}>{s.stage}</div>
                                <div style={{ display:"flex", alignItems:"baseline", gap:2, justifyContent:"center" }}>
                                  <span style={{ fontSize:28, fontWeight:700, color:st.text, fontVariantNumeric:"tabular-nums", lineHeight:1 }}>{s.count}</span>
                                  <span style={{ fontSize:11, color:st.text, opacity:0.8 }}>人</span>
                                </div>
                              </div>
                              {/* 失注分岐（下向き） */}
                              {dropoff !== null && dropoff > 0 ? (
                                <div style={{ marginTop:8, display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                                  <span style={{ fontSize:16, color:DS.rose, lineHeight:1 }}>↓</span>
                                  <div style={{
                                    padding:"3px 8px", background:"#FFF1F2", border:`1px solid ${DS.rose}33`,
                                    borderRadius:DS.radiusSm, display:"flex", alignItems:"center", gap:4,
                                  }}>
                                    <span style={{ fontSize:11, fontWeight:700, color:DS.rose, fontVariantNumeric:"tabular-nums" }}>{dropoff}</span>
                                    <span style={{ fontSize:10, color:DS.rose }}>失注</span>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ marginTop:8, height:40 }}/>
                              )}
                            </div>
                            {/* 矢印＋移行率 */}
                            {i < stages.length - 1 && (
                              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-start", padding:"38px 4px 0", minWidth:50 }}>
                                <div style={{
                                  padding:"3px 8px", background:DS.card, border:`1px solid ${convColor}55`,
                                  borderRadius:DS.radiusSm, marginBottom:4,
                                }}>
                                  <span style={{ fontSize:11, fontWeight:700, color:convColor, fontVariantNumeric:"tabular-nums" }}>
                                    {convRate !== null ? `${convRate}%` : "−"}
                                  </span>
                                </div>
                                <span style={{ fontSize:18, color:convColor, lineHeight:1 }}>→</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:12, marginTop:16, paddingTop:12, borderTop:`1px solid ${DS.border}` }}>
                      <span style={{ fontSize:12, color:DS.text2 }}>総失注</span>
                      <span style={{ fontSize:14, fontWeight:600, color:DS.rose }}>{totalLost}件</span>
                      <span style={{ fontSize:12, color:DS.text2 }}>
                        （{mc.length>0 ? Math.round((totalLost/mc.length)*100) : 0}%）
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* ── 停滞アラート ── */}
            {(()=>{
              const now = new Date();
              const stagnant = mc.filter(c => {
                const threshold = STAGNATION_THRESHOLDS[c.status];
                if (!threshold) return false;
                // status_historyの最後の変更時刻、またはaddedDateから経過時間を計算
                let lastChangeTime = null;
                if (c.leadTimes && c.leadTimes.length > 0) {
                  // leadTimesから推定（直近のatを使用）
                  try {
                    const history = JSON.parse(c.statusHistory || "[]");
                    if (history.length > 0) lastChangeTime = new Date(history[history.length - 1].at);
                  } catch(e) {}
                }
                if (!lastChangeTime && c.addedDate) lastChangeTime = new Date(c.addedDate);
                if (!lastChangeTime) return false;
                const hoursElapsed = (now - lastChangeTime) / 3600000;
                c._hoursElapsed = Math.round(hoursElapsed);
                return hoursElapsed > threshold;
              });
              stagnant.sort((a,b)=>(b.addedDate||"").localeCompare(a.addedDate||""));
              if (stagnant.length === 0) return null;
              return (
                <div style={{ background:"#FFF1F2", border:"1px solid #FCA5A5", borderRadius:DS.radius, padding:"1.25rem", marginBottom:16 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                    <AlertTriangle size={18} strokeWidth={1.5} color={DS.rose}/>
                    <div style={{ fontSize:14, fontWeight:700, color:DS.rose }}>停滞アラート（{stagnant.length}件）</div>
                  </div>
                  <div style={{ fontSize:11, color:DS.rose, marginBottom:12 }}>閾値を超えてステータスが変更されていない案件です</div>
                  <div style={{ overflowX:"auto" }}>
                    <table style={{ width:"100%", fontSize:13, borderCollapse:"collapse" }}>
                      <thead>
                        <tr style={{ borderBottom:"1px solid #FCA5A5" }}>
                          {["顧客名","担当者","現在のステータス","経過時間","閾値"].map(h=>(
                            <th key={h} style={{ padding:"6px 10px", textAlign:"left", fontSize:11, color:DS.rose, fontWeight:500 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {stagnant.map(c=>{
                          const threshold = STAGNATION_THRESHOLDS[c.status];
                          const st = STATUS_STYLE[c.status] || { bg:DS.border, text:"#64748B" };
                          const elapsed = c._hoursElapsed || 0;
                          const elapsedStr = elapsed >= 24 ? `${Math.floor(elapsed/24)}日${elapsed%24}時間` : `${elapsed}時間`;
                          return (
                            <tr key={c.id} style={{ borderBottom:"1px solid #FECACA", background:"#FFF1F2" }}>
                              <td style={{ padding:"8px 10px", fontWeight:600, color:DS.rose }}>{c.name}</td>
                              <td style={{ padding:"8px 10px" }}>{c.assigned || "未定"}</td>
                              <td style={{ padding:"8px 10px" }}>
                                <span style={{ fontSize:11, padding:"3px 8px", borderRadius:4, background:st.bg, color:st.text, fontWeight:500 }}>{c.status}</span>
                              </td>
                              <td style={{ padding:"8px 10px", fontWeight:700, color:DS.rose }}>{elapsedStr}経過</td>
                              <td style={{ padding:"8px 10px", fontSize:12, color:DS.rose }}>{threshold}時間以内</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* ── 顧客ごとの進捗変化リードタイム ── */}
            <div style={{ background:DS.card, border:`1px solid ${DS.border}`, borderRadius:DS.radius, padding:"1.25rem", marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>顧客ごとの進捗変化リードタイム</div>
              <div style={{ fontSize:11, color:DS.text2, marginBottom:14 }}>各ステージ移行にかかった時間（エルステップの対応マーク変更時刻から自動計算）</div>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", fontSize:13, borderCollapse:"collapse", minWidth:700 }}>
                  <thead>
                    <tr style={{ borderBottom:`1px solid ${DS.border}`, background:DS.beige }}>
                      <th style={{ padding:"8px 12px", textAlign:"left", fontSize:11, color:DS.text2, fontWeight:500 }}>顧客名</th>
                      <th style={{ padding:"8px 12px", textAlign:"left", fontSize:11, color:DS.text2, fontWeight:500 }}>友達追加日</th>
                      <th style={{ padding:"8px 12px", textAlign:"left", fontSize:11, color:DS.text2, fontWeight:500 }}>現在のステータス</th>
                      <th style={{ padding:"8px 12px", textAlign:"left", fontSize:11, color:DS.text2, fontWeight:500 }}>ステージ変化の履歴</th>
                      <th style={{ padding:"8px 12px", textAlign:"right", fontSize:11, color:DS.text2, fontWeight:500 }}>累計リードタイム</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mc.map((c,i)=>{
                      const st=STATUS_STYLE[c.status]||{bg:DS.border,text:"#64748B"};
                      const totalHours=(c.leadTimes||[]).reduce((s,l)=>s+l.hours,0);
                      return (
                        <tr key={c.id} style={{ borderBottom:`1px solid ${DS.border}`, background:i%2===0?"transparent":DS.hover }}>
                          <td style={{ padding:"10px 12px", fontWeight:500 }}>{c.name}</td>
                          <td style={{ padding:"10px 12px", fontSize:12, color:DS.text2 }}>{c.addedDate||"−"}</td>
                          <td style={{ padding:"10px 12px" }}>
                            <span style={{ fontSize:11, padding:"3px 8px", borderRadius:4, background:st.bg, color:st.text, fontWeight:500 }}>{c.status}</span>
                          </td>
                          <td style={{ padding:"8px 12px" }}>
                            {(c.leadTimes||[]).length===0
                              ? <span style={{ fontSize:11, color:DS.text2 }}>まだ移行なし</span>
                              : <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                                  {(c.leadTimes||[]).map((l,j)=>(
                                    <span key={j} style={{ fontSize:11, padding:"2px 8px", borderRadius:4, background:DS.beige, color:DS.text2, whiteSpace:"nowrap" }}>
                                      {l.from}→{l.to} <b style={{ color:DS.text1 }}>{l.hours}h</b>
                                    </span>
                                  ))}
                                </div>
                            }
                          </td>
                          <td style={{ padding:"10px 12px", textAlign:"right", fontWeight:500, color: totalHours>0?DS.indigo:"#64748B" }}>
                            {totalHours>0 ? `${totalHours}時間` : "−"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── 全案件リスト ── */}
            <div style={{ background:DS.card, border:`1px solid ${DS.border}`, borderRadius:DS.radius, padding:"24px", boxShadow:DS.shadow }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <div style={{ fontSize:14, fontWeight:700 }}>全案件リスト</div>
                <Btn onClick={()=>setModal({type:"customer",data:{}})} variant="primary">＋ 顧客追加</Btn>
              </div>
              <table style={{ width:"100%", fontSize:13, borderCollapse:"collapse" }}>
                <thead><tr style={{ borderBottom:`1px solid ${DS.border}` }}>
                  {["顧客名","案件名","進捗","契約見込み金","担当者","着金予定日",""].map(h=><th key={h} style={{ padding:"6px 8px", textAlign:"left", fontSize:11, color:DS.text2, fontWeight:400 }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {mc.map(c=>{
                    const estimate=(c.commission||0)+(c.ad||0)+(c.otherRevenue||0);
                    const st=STATUS_STYLE[c.status]||{bg:DS.border,text:"#64748B"};
                    return (
                      <tr key={c.id} style={{ borderBottom:`1px solid ${DS.border}` }}>
                        <td style={{ padding:"8px 8px", fontWeight:500 }}>{c.name}</td>
                        <td style={{ padding:"8px 8px", color:DS.text2 }}>{c.caseName||"−"}</td>
                        <td style={{ padding:"8px 8px" }}><span style={{ fontSize:11, padding:"3px 8px", borderRadius:4, background:st.bg, color:st.text, fontWeight:500 }}>{c.status}</span></td>
                        <td style={{ padding:"8px 8px", fontWeight:500 }}>{estimate>0?`${estimate.toLocaleString()}円`:"0円"}</td>
                        <td style={{ padding:"8px 8px" }}>{c.assigned}</td>
                        <td style={{ padding:"8px 8px", fontSize:12, color:DS.text2 }}>{c.paymentDate||"−"}</td>
                        <td style={{ padding:"8px 8px" }}><button onClick={()=>setModal({type:"customer",data:c})} style={{ fontSize:11, background:"none", border:"none", cursor:"pointer", color:DS.text2 }}>編集</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* ===== 売上管理 ===== */}
      {tab==="revenue" && (()=>{
        const REVENUE_TYPES = ["仲介手数料","AD","その他売上"];
        const TYPE_STYLE = { "仲介手数料":{ color:DS.indigo,bg:"#EEF2FF" }, "AD":{ color:DS.emerald,bg:"#D1FAE5" }, "その他売上":{ color:DS.indigo,bg:"#EEF2FF" } };

        // 月一覧（データから自動生成）
        const allMonths = [...new Set(revenueItems.map(r=>r.month))].sort().reverse();
        const months2026 = YEAR_MONTHS;

        // 年間集計
        const annualTotal   = revenueItems.reduce((s,r)=>s+r.amount,0);
        const annualPaid    = revenueItems.filter(r=>r.status==="入金済").reduce((s,r)=>s+r.amount,0);
        const annualOverdue = revenueItems.filter(r=>r.status==="期日超過").reduce((s,r)=>s+r.amount,0);
        const annualByType  = REVENUE_TYPES.map(type=>({
          type,
          total: revenueItems.filter(r=>r.type===type).reduce((s,r)=>s+r.amount,0),
          paid:  revenueItems.filter(r=>r.type===type&&r.status==="入金済").reduce((s,r)=>s+r.amount,0),
        }));

        // 月別集計（年間バー用）
        const monthlyTotals = months2026.map(m=>({
          month: m,
          total: revenueItems.filter(r=>r.month===m).reduce((s,r)=>s+r.amount,0),
          paid:  revenueItems.filter(r=>r.month===m&&r.status==="入金済").reduce((s,r)=>s+r.amount,0),
        }));
        const maxMonthly = Math.max(...monthlyTotals.map(m=>m.total), 1);

        // 月次集計（選択月）
        const monthItems    = revenueItems.filter(r=>r.month===revenueMonth);
        const monthTotal    = monthItems.reduce((s,r)=>s+r.amount,0);
        const monthPaid     = monthItems.filter(r=>r.status==="入金済").reduce((s,r)=>s+r.amount,0);
        const monthOverdue  = monthItems.filter(r=>r.status==="期日超過").reduce((s,r)=>s+r.amount,0);
        const monthUnpaid   = monthTotal - monthPaid;

        // 行追加・削除は顧客データに紐づくため、顧客管理タブから追加してください

        return (
          <div>
            {/* 担当者フィルター */}
            <div style={{ display:"flex", alignItems:"center", gap:1, background:"#F1F5F9", borderRadius:8, padding:"3px", marginBottom:16 }}>
              {["全員",...STAFF.filter(s=>s!=="対応者不明")].map(name=>{
                const isActive = selectedStaff === name;
                const count = name === "全員" ? customers.length : customers.filter(c=>c.assigned===name).length;
                return (
                  <button key={name} onClick={()=>setSelectedStaff(name)} style={{
                    fontSize:12, fontWeight:isActive?600:400, padding:"5px 12px", borderRadius:6,
                    border:"none", cursor:"pointer", userSelect:"none",
                    background:isActive?"#fff":"transparent",
                    color:isActive?DS.teal:"#475569",
                    boxShadow:isActive?"0 1px 3px rgba(0,0,0,0.08)":"none",
                    transition:"all 0.2s",
                  }}>
                    {name === "全員" ? name : displayStaffName(name)}<span style={{ fontSize:10, marginLeft:3, opacity:0.7 }}>({count})</span>
                  </button>
                );
              })}
            </div>

            {/* 売上4ボックス: 仲介 / AD / その他 / 合計（各ボックス内に 見込み・成約・着金 の3軸） */}
            {sales3Axis && (() => {
              const types = [
                { id:"fee",   label:"仲介手数料売上", color:DS.teal,    accent:"#0F766E" },
                { id:"ad",    label:"AD売上",         color:DS.indigo,  accent:"#4338CA" },
                { id:"other", label:"その他売上",     color:"#7C3AED",  accent:"#6D28D9" },
                { id:"total", label:"合計売上",       color:DS.emerald, accent:"#047857" },
              ];
              const get = (axisData, typeId) => {
                if (typeId === "total") return axisData.total || 0;
                return axisData[typeId] || 0;
              };
              return (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:16 }}>
                  {types.map(t=>(
                    <Card key={t.id} style={{ padding:"14px 16px", borderTop:`3px solid ${t.color}` }}>
                      <div style={{ fontSize:12, fontWeight:600, color:t.color, marginBottom:10 }}>{t.label}</div>
                      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                        <div>
                          <div style={{ fontSize:10, color:DS.amber, fontWeight:600 }}>見込み</div>
                          <div style={{ fontSize:15, fontWeight:600, color:DS.text1, fontVariantNumeric:"tabular-nums" }}>¥{get(sales3Axis.prospect, t.id).toLocaleString()}</div>
                        </div>
                        <div>
                          <div style={{ fontSize:10, color:DS.indigo, fontWeight:600 }}>成約ベース</div>
                          <div style={{ fontSize:15, fontWeight:600, color:DS.text1, fontVariantNumeric:"tabular-nums" }}>¥{get(sales3Axis.contract_based, t.id).toLocaleString()}</div>
                        </div>
                        <div>
                          <div style={{ fontSize:10, color:DS.emerald, fontWeight:600 }}>着金ベース</div>
                          <div style={{ fontSize:15, fontWeight:700, color:t.accent, fontVariantNumeric:"tabular-nums" }}>¥{get(sales3Axis.received_based, t.id).toLocaleString()}</div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              );
            })()}
            {sales3AxisLoading && !sales3Axis && (
              <div style={{ fontSize:11, color:DS.text2, marginBottom:12 }}>3軸売上を読込中...</div>
            )}

            {/* 既存KPI x3（選択月に連動・リスト/カレンダー用） */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:16 }}>
              <KpiCard size="md" label="月間合計" value={`${monthTotal.toLocaleString()}円`} color={DS.teal} bg={DS.greenBg} icon={<TrendingUp size={18} strokeWidth={1.5}/>}/>
              <KpiCard size="md" label="入金済み" value={`${monthPaid.toLocaleString()}円`} color={DS.emerald} bg="#D1FAE5" icon={<CheckCircle size={18} strokeWidth={1.5}/>}/>
              <KpiCard size="md" label="未回収額" value={`${monthUnpaid.toLocaleString()}円`} color={DS.amber} bg="#FEF3C7" icon={<Clock size={18} strokeWidth={1.5}/>}/>
            </div>

            {/* 着金進捗バー（仲介/AD/その他 3分割） */}
            <Card style={{ marginBottom:20, padding:"16px 20px" }}>
              <div style={{ fontSize:12, fontWeight:600, color:DS.text2, marginBottom:10 }}>着金進捗</div>
              <div style={{ display:"flex", gap:12 }}>
                {REVENUE_TYPES.map(type=>({
                  type,
                  total: monthItems.filter(r=>r.type===type).reduce((s,r)=>s+r.amount,0),
                  paid:  monthItems.filter(r=>r.type===type&&r.status==="入金済").reduce((s,r)=>s+r.amount,0),
                })).map(t=>{
                  const pct = t.total ? Math.round((t.paid/t.total)*100) : 0;
                  const color = t.type==="仲介手数料"?DS.teal:t.type==="AD"?DS.indigo:DS.text3;
                  return (
                    <div key={t.type} style={{ flex:1 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:DS.text2, marginBottom:4 }}>
                        <span>{t.type}</span><span>{pct}%</span>
                      </div>
                      <div style={{ width:"100%", height:8, background:"#E2E8F0", borderRadius:4, overflow:"hidden" }}>
                        <div style={{ width:`${pct}%`, height:"100%", background:color, borderRadius:4 }}/>
                      </div>
                      <div style={{ fontSize:10, color:DS.text3, marginTop:3 }}>{t.paid.toLocaleString()} / {t.total.toLocaleString()}円</div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* ビュー切り替え + 月選択（全ビュー共通） */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1rem", gap:12, flexWrap:"wrap" }}>
              <div style={{ display:"flex", gap:8 }}>
                {[{id:"monthly",label:"リスト"},{id:"calendar",label:"カレンダー"},{id:"annual",label:"コホート"}].map(v=>(
                  <button key={v.id} onClick={()=>setRevenueView(v.id)} style={{ fontSize:12, padding:"7px 16px", borderRadius:6, border:`1px solid ${DS.border}`, background:revenueView===v.id?DS.teal:"#fff", color:revenueView===v.id?"#fff":DS.text1, cursor:"pointer", fontWeight:500, transition:"all 0.15s" }}>{v.label}</button>
                ))}
              </div>
              {/* 月選択 + 今期トグル（売上ボックスに連動） */}
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
                {(allMonths.length>0?allMonths:months2026).map(m=>(
                  <button key={m} onClick={()=>{ setRevenueMonth(m); setRevenueFiscal(false); }} style={{ fontSize:11, padding:"5px 10px", borderRadius:5, border:`1px solid ${DS.border}`, background:(!revenueFiscal && revenueMonth===m)?DS.text1:"#fff", color:(!revenueFiscal && revenueMonth===m)?"#fff":DS.text1, cursor:"pointer", fontWeight:(!revenueFiscal && revenueMonth===m)?500:400 }}>
                    {m}
                  </button>
                ))}
                <button onClick={()=>setRevenueFiscal(v=>!v)} style={{ fontSize:11, padding:"5px 12px", borderRadius:5, border:`1px solid ${revenueFiscal?DS.teal:DS.border}`, background:revenueFiscal?DS.teal:"#fff", color:revenueFiscal?"#fff":DS.text1, cursor:"pointer", fontWeight:revenueFiscal?600:500, marginLeft:4 }}>
                  今期
                </button>
              </div>
            </div>

            {/* ===== コホートビュー ===== */}
            {revenueView==="annual" && (()=>{
              const cohortData = buildCohortFlow(revenueCustomers, revenueMonth);
              if (cohortData.cohorts.length === 0) return <Card><div style={{ padding:"2rem", textAlign:"center", color:DS.text2, fontSize:13 }}>コホートデータがありません</div></Card>;
              const [,tmo] = revenueMonth.split("/");
              return (
                <Card>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700 }}>コホート別着金フロー</div>
                      <div style={{ fontSize:11, color:DS.text2, marginTop:2 }}>友だち追加月別の着金状況</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:11, color:DS.text2 }}>合計</div>
                      <div style={{ fontSize:18, fontWeight:600 }}>{cohortData.totalExpected.toLocaleString()}円</div>
                    </div>
                  </div>
                  {/* 全体プログレス */}
                  <div style={{ marginBottom:20 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:DS.text2, marginBottom:4 }}>
                      <span>全体着金率</span>
                      <span>{cohortData.rate}%（着金済 {cohortData.totalCollected.toLocaleString()}円 / 未入金 {cohortData.totalUncollected.toLocaleString()}円）</span>
                    </div>
                    <div style={{ width:"100%", height:8, background:DS.beige, borderRadius:4, overflow:"hidden" }}>
                      <div style={{ width:`${cohortData.rate}%`, height:"100%", background:cohortData.rate>=80?DS.emerald:cohortData.rate>=50?DS.amber:DS.rose, borderRadius:4, transition:"width 0.3s" }}/>
                    </div>
                  </div>
                  {/* コホート行 */}
                  {cohortData.cohorts.map((ch,ci)=>{
                    const isLast = ci === cohortData.cohorts.length - 1;
                    const isOpen = expandedCohort === ch.month;
                    const rateColor = ch.rate>=80?DS.emerald:ch.rate>=50?DS.amber:DS.rose;
                    const rateBg = ch.rate>=80?"#D1FAE5":ch.rate>=50?"#FEF3C7":"#FFF1F2";
                    const [,cmo] = ch.month.split("/");
                    return (
                      <div key={ch.month}>
                        <div onClick={()=>setExpandedCohort(isOpen?null:ch.month)} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0", cursor:"pointer", borderTop:ci>0?`1px solid ${DS.border}`:"none" }}>
                          <span style={{ fontSize:12, color:DS.text2, width:14 }}>{isLast?"└":"├"}</span>
                          <div style={{ flex:1 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                              <span style={{ fontSize:13, fontWeight:600 }}>{parseInt(cmo)}月追加の顧客から</span>
                              <span style={{ fontSize:12, fontWeight:600 }}>{ch.expected.toLocaleString()}円</span>
                              <span style={{ fontSize:11, color:DS.text2 }}>（{ch.count}件）</span>
                              <span style={{ fontSize:11, marginLeft:"auto", padding:"2px 8px", borderRadius:4, background:rateBg, color:rateColor, fontWeight:600 }}>{ch.rate}%</span>
                            </div>
                            <div style={{ width:"100%", height:6, background:DS.beige, borderRadius:3, overflow:"hidden", marginBottom:4 }}>
                              <div style={{ width:`${ch.rate}%`, height:"100%", background:rateColor, borderRadius:3, transition:"width 0.3s" }}/>
                            </div>
                            <div style={{ fontSize:11, color:DS.text2 }}>
                              着金済み <b style={{ color:DS.emerald }}>{ch.collected.toLocaleString()}円</b> / 未入金 <b style={{ color:DS.indigo }}>{ch.uncollected.toLocaleString()}円</b>
                            </div>
                          </div>
                          <span style={{ fontSize:14, color:DS.text2 }}>{isOpen?"▲":"▼"}</span>
                        </div>
                        {isOpen && (
                          <div style={{ marginLeft:26, marginBottom:8 }}>
                            <table style={{ width:"100%", fontSize:12, borderCollapse:"collapse" }}>
                              <thead><tr style={{ borderBottom:`1px solid ${DS.border}` }}>
                                {["顧客名","担当","仲介手数料","AD","その他","着金状況"].map(h=><th key={h} style={{ padding:"6px 8px", textAlign:"left", fontSize:11, color:DS.text2, fontWeight:500 }}>{h}</th>)}
                              </tr></thead>
                              <tbody>
                                {ch.details.map((d,di)=>(
                                  <tr key={di} style={{ borderBottom:`0.5px solid #E2E8F0` }}>
                                    <td style={{ padding:"6px 8px", fontWeight:500 }}>{d.name}</td>
                                    <td style={{ padding:"6px 8px" }}>{d.staff}</td>
                                    <td style={{ padding:"6px 8px" }}>{d.fee>0?`${d.fee.toLocaleString()}円`:"−"}</td>
                                    <td style={{ padding:"6px 8px" }}>{d.ad>0?`${d.ad.toLocaleString()}円`:"−"}</td>
                                    <td style={{ padding:"6px 8px" }}>{d.other>0?`${d.other.toLocaleString()}円`:"−"}</td>
                                    <td style={{ padding:"6px 8px" }}>
                                      <span style={{ fontSize:11 }}>
                                        {d.fee>0&&<span style={{ marginRight:4 }}>仲介{d.feePaid?" 済":" 未"}</span>}
                                        {d.ad>0&&<span style={{ marginRight:4 }}>AD{d.adPaid?" 済":" 未"}</span>}
                                        {d.other>0&&<span>他{d.otherPaid?" 済":" 未"}</span>}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </Card>
              );
            })()}

            {/* ===== カレンダービュー ===== */}
            {revenueView==="calendar" && (()=>{
              const [calYear, calMonth] = revenueMonth.split("/").map(Number);
              const firstDay = new Date(calYear, calMonth - 1, 1).getDay();
              const daysInMonth = new Date(calYear, calMonth, 0).getDate();
              const weeks = [];
              let week = Array(7).fill(null);
              for (let d = 1; d <= daysInMonth; d++) {
                const dow = (firstDay + d - 1) % 7;
                week[dow] = d;
                if (dow === 6 || d === daysInMonth) { weeks.push(week); week = Array(7).fill(null); }
              }
              // 着金予定をカレンダー上にマッピング（仲介/AD/その他の全日付を反映）
              const paymentsByDay = {};
              const calPayments = buildPaymentsFromCustomers(revenueCustomers);
              calPayments.forEach(p => {
                if (!p.date) return;
                const pd = p.date.replace(/-/g, "/");
                const [py, pm, pDay] = pd.split("/").map(Number);
                if (py === calYear && pm === calMonth && pDay) {
                  if (!paymentsByDay[pDay]) paymentsByDay[pDay] = [];
                  paymentsByDay[pDay].push({ ...p, name: p.name.replace(/ 様$/, ""), status: p.status === "着金" ? "着金" : "未着金" });
                }
              });
              const today = new Date();
              const isCurrentMonth = calYear === today.getFullYear() && calMonth === today.getMonth() + 1;
              const todayDate = today.getDate();

              const prevMonth = () => {
                const m = calMonth === 1 ? 12 : calMonth - 1;
                const y = calMonth === 1 ? calYear - 1 : calYear;
                setRevenueMonth(`${y}/${String(m).padStart(2, "0")}`);
              };
              const nextMonth = () => {
                const m = calMonth === 12 ? 1 : calMonth + 1;
                const y = calMonth === 12 ? calYear + 1 : calYear;
                setRevenueMonth(`${y}/${String(m).padStart(2, "0")}`);
              };

              return (
                <div>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                    <button onClick={prevMonth} style={{ fontSize:14, padding:"6px 14px", borderRadius:6, border:`1px solid ${DS.border}`, background:DS.beige, cursor:"pointer" }}>◀ 前月</button>
                    <div style={{ fontSize:16, fontWeight:700 }}>{calYear}年{calMonth}月</div>
                    <button onClick={nextMonth} style={{ fontSize:14, padding:"6px 14px", borderRadius:6, border:`1px solid ${DS.border}`, background:DS.beige, cursor:"pointer" }}>翌月 ▶</button>
                  </div>
                  {/* 月次KPI */}
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:16 }}>
                    {[
                      { label:"月間売上合計", value:`${(monthTotal).toLocaleString()}円`, color:DS.indigo, bg:"#EEF2FF" },
                      { label:"着金済み", value:`${(monthPaid).toLocaleString()}円`, color:DS.emerald, bg:"#D1FAE5" },
                      { label:"未着金", value:`${(monthUnpaid).toLocaleString()}円`, color:DS.amber, bg:"#FEF3C7" },
                    ].map(c=>(
                      <div key={c.label} style={{ background:c.bg, borderRadius:DS.radiusSm, padding:"12px 16px" }}>
                        <div style={{ fontSize:11, color:c.color, marginBottom:4 }}>{c.label}</div>
                        <div style={{ fontSize:22, fontWeight:500, color:c.color }}>{c.value}</div>
                      </div>
                    ))}
                  </div>
                  {/* カレンダーグリッド */}
                  <div style={{ background:DS.card, border:`1px solid ${DS.border}`, borderRadius:DS.radius, overflow:"hidden" }}>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", borderBottom:`1px solid ${DS.border}` }}>
                      {["日","月","火","水","木","金","土"].map(d=>(
                        <div key={d} style={{ padding:"8px", textAlign:"center", fontSize:11, fontWeight:600, color:d==="日"?DS.rose:d==="土"?DS.indigo:DS.text2, background:DS.beige }}>{d}</div>
                      ))}
                    </div>
                    {weeks.map((w, wi) => (
                      <div key={wi} style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", borderBottom:wi < weeks.length - 1 ? `1px solid ${DS.border}` : "none" }}>
                        {w.map((day, di) => {
                          const entries = day ? (paymentsByDay[day] || []) : [];
                          const isToday = isCurrentMonth && day === todayDate;
                          return (
                            <div key={di} style={{ minHeight:80, padding:"4px 6px", borderRight:di < 6 ? `1px solid ${DS.border}` : "none", background:isToday ? "#FFFDE7" : day ? "transparent" : "#FAFAF9" }}>
                              {day && (
                                <>
                                  <div style={{ fontSize:12, fontWeight:isToday ? 700 : 400, color:di===0?DS.rose:di===6?DS.indigo:DS.text1, marginBottom:4 }}>
                                    {day}
                                    {isToday && <span style={{ fontSize:9, background:DS.rose, color:"#fff", padding:"1px 4px", borderRadius:3, marginLeft:4 }}>今日</span>}
                                  </div>
                                  {entries.map((p, ci) => {
                                    const isPaid = p.status === "着金";
                                    const isPastDue = !isPaid && day && isCurrentMonth && day < todayDate;
                                    return (
                                      <div key={ci} style={{ fontSize:10, padding:"2px 4px", borderRadius:3, marginBottom:2, background:isPaid?"#D1FAE5":isPastDue?"#FFF1F2":DS.border, color:isPaid?DS.emerald:isPastDue?DS.rose:"#64748B", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                                        {p.name} {p.type.substring(0,2)} {p.amount.toLocaleString()}円
                                      </div>
                                    );
                                  })}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize:11, color:DS.text2, marginTop:8, display:"flex", gap:12 }}>
                    <span style={{ display:"flex", alignItems:"center", gap:4 }}><span style={{ width:10, height:10, borderRadius:2, background:"#D1FAE5", display:"inline-block" }}/>着金済み</span>
                    <span style={{ display:"flex", alignItems:"center", gap:4 }}><span style={{ width:10, height:10, borderRadius:2, background:DS.border, display:"inline-block" }}/>未着金</span>
                  </div>
                </div>
              );
            })()}

            {/* ===== リストビュー ===== */}
            {revenueView==="monthly" && (
              <div>
                {/* 月次明細テーブル */}
                <div style={{ fontSize:12, color:DS.text2, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>{revenueMonth} の入金明細</div>
                <div style={{ background:DS.card, border:`1px solid ${DS.border}`, borderRadius:DS.radius, overflow:"hidden", marginBottom:12 }}>
                  <div style={{ overflowX:"auto" }}>
                    <table style={{ width:"100%", fontSize:13, borderCollapse:"collapse", minWidth:860 }}>
                      <thead>
                        <tr style={{ borderBottom:`1px solid ${DS.border}`, background:DS.beige }}>
                          {["顧客名","案件名","種別","金額","着金予定日","着金実績日","状態","担当",""].map(h=>(
                            <th key={h} style={{ padding:"9px 12px", textAlign:"left", fontSize:11, color:DS.text2, fontWeight:500, whiteSpace:"nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {monthItems.map((r,i)=>{
                          const ss = r.status==="入金済"?{bg:"#D1FAE5",color:DS.emerald}: r.status==="期日超過"?{bg:"#FFF1F2",color:DS.rose}:{bg:"#EEF2FF",color:DS.indigo};
                          const ts = TYPE_STYLE[r.type]||{bg:DS.hover,color:DS.text2};
                          return (
                            <tr key={r.id} style={{ borderBottom:`1px solid ${DS.border}`, background:i%2===0?"transparent":DS.hover }}>
                              {/* 顧客名（読取専用） */}
                              <td style={{ padding:"9px 12px", fontSize:13, fontWeight:500 }}>{r.name}</td>
                              {/* 案件名（onBlurで保存） */}
                              <td style={{ padding:"6px 12px" }}>
                                <input defaultValue={r.caseName} key={`${r.lineUserId}_case_${r.caseName}`} onBlur={e=>{ if(e.target.value!==r.caseName) updateRevenue(r.id,"caseName",e.target.value); }} placeholder="案件名を入力" style={{ fontSize:13, padding:"4px 8px", borderRadius:4, border:`1px solid ${DS.border}`, background:"#fff", color:DS.text1, width:130 }} onFocus={e=>e.target.style.border="0.5px solid #E2E8F0"}/>
                              </td>
                              {/* 種別（読取専用） */}
                              <td style={{ padding:"6px 12px" }}>
                                <span style={{ fontSize:11, padding:"4px 10px", borderRadius:4, background:ts.bg, color:ts.color, fontWeight:500 }}>{r.type}</span>
                              </td>
                              {/* 金額 */}
                              <td style={{ padding:"9px 12px", fontWeight:500 }}>{r.amount.toLocaleString()}円</td>
                              {/* 着金予定日 */}
                              <td style={{ padding:"6px 12px" }}>
                                <input type="date" value={r.paidDate?r.paidDate.replace(/\//g,"-"):""} onChange={e=>updateRevenuePaidDate(r.id,e.target.value)} style={{ fontSize:12, padding:"4px 6px", borderRadius:4, border:`1px solid ${DS.border}`, background:DS.beige, color:DS.text1 }}/>
                              </td>
                              {/* 着金実績日（手動編集） */}
                              <td style={{ padding:"6px 12px" }}>
                                <input type="date" value={r.receivedDate?r.receivedDate.replace(/\//g,"-"):""} onChange={e=>{
                                  const v = e.target.value ? e.target.value.replace(/-/g,"/") : "";
                                  updateField(r.customerId, r.receivedField, v);
                                  showToast("着金実績日を更新しました");
                                }} style={{ fontSize:12, padding:"4px 6px", borderRadius:4, border:`1px solid ${DS.border}`, background:r.receivedDate?"#D1FAE5":DS.beige, color:DS.text1 }}/>
                              </td>
                              {/* 状態 */}
                              <td style={{ padding:"6px 12px" }}>
                                <button onClick={()=>toggleRevenueStatus(r.id)} style={{ fontSize:11, padding:"4px 12px", borderRadius:4, background:ss.bg, color:ss.color, border:`0.5px solid ${r.status==="入金済"?"#6EE7B7":r.status==="期日超過"?"#FECDD3":"#C7D2FE"}`, cursor:"pointer", fontWeight:500 }}>
                                  {r.status}
                                </button>
                              </td>
                              {/* 担当 */}
                              <td style={{ padding:"6px 12px" }}>
                                <select value={r.assigned} onChange={e=>{ updateRevenue(r.id,"assigned",e.target.value); showToast("担当者を変更しました"); }} style={{ fontSize:12, padding:"4px 6px", borderRadius:4, border:`1px solid ${DS.border}`, background:DS.beige, color:DS.text1 }}>
                                  {STAFF.map(s=><option key={s} value={s}>{displayStaffName(s)}</option>)}
                                </select>
                              </td>
                              <td></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {monthItems.length===0 && <div style={{ padding:"2rem", textAlign:"center", color:DS.text2, fontSize:13 }}>{revenueMonth} のデータはありません</div>}
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ fontSize:11, color:DS.text2 }}>
                    {monthItems.length}件　合計 {monthTotal.toLocaleString()}円　入金済 {monthPaid.toLocaleString()}円
                  </div>
                  <span/>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ===== 営業マン別 一覧 ===== */}
      {tab==="team" && !selectedMember && (()=>{
        // チーム平均スコア
        const activeScores = staffScores ? staffScores.filter(s=>s.customerCount>0) : [];
        const teamAvgScore = activeScores.length > 0 ? (activeScores.reduce((s,v)=>s+v.score.total,0)/activeScores.length).toFixed(1) : "−";

        // ファネルデータ (全員)
        const funnelPool = customers;
        const FUNNEL_STAGES = ["未対応","物件提案中","内見","審査中","審査通過済み（契約準備中）","仲介手数料着金済み","その他売上着金済み","契約済み","AD着金済み"];
        const funnelCounts = FUNNEL_STAGES.map((st,i)=>{
          const atOrBeyond = funnelPool.filter(c=>{
            const ci = PIPELINE_ORDER.indexOf(c.status);
            return ci >= i && c.status !== "失注（離脱中・シナリオ配信中）";
          }).length;
          return { stage:st, count:atOrBeyond };
        });
        const lostTotal = funnelPool.filter(c=>c.status==="失注（離脱中・シナリオ配信中）").length;

        return (
          <div>
            {/* 1. チーム平均スコア */}
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:600, color:DS.text2, marginBottom:4 }}>チーム平均スコア <span style={{ fontSize:20, fontWeight:700, color:DS.teal }}>{teamAvgScore}</span><span style={{ fontSize:12, color:DS.text3 }}>/10</span></div>
            </div>

            {/* 2. 全体移行率ファネル（横型）— チーム平均スコア直下 */}
            <Card style={{ marginBottom:24 }}>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:16 }}>全体移行率ファネル</div>
              <div style={{ overflowX:"auto" }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:0, minWidth:funnelCounts.length*120 }}>
                  {funnelCounts.map((f, i)=>{
                    const st = STATUS_STYLE[f.stage] || { bg:DS.border, text:"#64748B" };
                    const nextCount = i < funnelCounts.length - 1 ? funnelCounts[i+1].count : null;
                    const passRate = nextCount !== null && f.count > 0 ? Math.round((nextCount / f.count) * 100) : null;
                    return (
                      <div key={f.stage} style={{ display:"flex", alignItems:"flex-start" }}>
                        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", minWidth:90 }}>
                          <div style={{
                            padding:"10px 12px", background:st.bg, borderRadius:DS.radius,
                            display:"flex", flexDirection:"column", alignItems:"center", gap:3,
                            minWidth:90, textAlign:"center",
                          }}>
                            <span style={{ fontSize:10, fontWeight:600, color:st.text, whiteSpace:"nowrap" }}>{f.stage.length>6?f.stage.substring(0,6)+"…":f.stage}</span>
                            <span style={{ fontSize:18, fontWeight:700, color:st.text, fontVariantNumeric:"tabular-nums" }}>{f.count}<span style={{ fontSize:10 }}>人</span></span>
                          </div>
                        </div>
                        {i < funnelCounts.length - 1 && (
                          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"14px 4px", minWidth:36 }}>
                            <span style={{ fontSize:10, fontWeight:600, color:passRate>=60?DS.emerald:passRate>=40?DS.amber:DS.rose }}>{passRate}%</span>
                            <span style={{ fontSize:13, color:DS.text2 }}>→</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:12, marginTop:12, paddingTop:10, borderTop:`1px solid ${DS.border}` }}>
                  <span style={{ fontSize:12, color:DS.text2 }}>総失注</span>
                  <span style={{ fontSize:14, fontWeight:600, color:DS.rose }}>{lostTotal}人</span>
                </div>
              </div>
            </Card>

            {/* 3. 営業マン一覧（縦並び・1人1行・アコーディオン） */}
            <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
              {team.map(m=>{
                const sc = staffScores ? staffScores.find(s=>s.staff===m.name) : null;
                const total = sc ? sc.score.total : 0;
                const myCustomers = mc.filter(c=>c.assigned===m.name);
                const myRevenue = calcContractRevenue(myCustomers);
                const isExpanded = expandedTeamMember === m.name;
                const currentMonth = `${CURRENT_YEAR}-${String(CURRENT_MONTH).padStart(2,"0")}`;
                const goal = goals.find(g => g.staff === m.name && g.month === currentMonth);
                const monthContracts = contractedInMonth(selectedMonth, customers.filter(c=>c.assigned===m.name));
                const salesPct = goal && goal.salesTarget > 0 ? Math.min(Math.round(myRevenue / goal.salesTarget * 100), 200) : 0;
                const contractPct = goal && goal.contractTarget > 0 ? Math.min(Math.round(monthContracts / goal.contractTarget * 100), 200) : 0;
                const barColor = pct => pct >= 100 ? DS.emerald : pct >= 70 ? DS.orange : DS.rose;
                return (
                  <div key={m.name} style={{ background:DS.card, border:`1px solid ${DS.border}`, borderRadius:DS.radius, overflow:"hidden" }}>
                    {/* 行ヘッダー（クリックで展開） */}
                    <div onClick={()=>setExpandedTeamMember(isExpanded?null:m.name)} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", cursor:"pointer", transition:"background 0.15s", background:isExpanded?DS.hover:"transparent" }}>
                      <div style={{ width:36, height:36, borderRadius:"50%", background:m.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:600, color:m.color, flexShrink:0 }}>{displayStaffName(m.name)[0]}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:600 }}>{displayStaffName(m.name)}</div>
                      </div>
                      <div style={{ fontSize:22, fontWeight:700, color:total>=7?DS.emerald:total>=5?DS.amber:DS.rose, fontVariantNumeric:"tabular-nums", minWidth:40, textAlign:"center" }}>{total||"−"}<span style={{ fontSize:10, color:DS.text3, fontWeight:400 }}>/10</span></div>
                      <div style={{ fontSize:12, color:DS.text2, minWidth:60, textAlign:"center" }}>{myCustomers.length}件担当</div>
                      <div style={{ fontSize:13, fontWeight:500, color:DS.text1, minWidth:100, textAlign:"right", fontVariantNumeric:"tabular-nums" }}>¥{myRevenue.toLocaleString()}</div>
                      <button onClick={e=>{e.stopPropagation();setSelectedMember(m.name);}} style={{ fontSize:12, color:DS.teal, background:"none", border:"none", cursor:"pointer", fontWeight:500, padding:"4px 8px", whiteSpace:"nowrap" }}>詳細→</button>
                      <ChevronRight size={16} strokeWidth={1.5} color={DS.text3} style={{ transform:isExpanded?"rotate(90deg)":"rotate(0deg)", transition:"transform 0.2s", flexShrink:0 }}/>
                    </div>

                    {/* アコーディオン展開 */}
                    {isExpanded && (
                      <div style={{ padding:"0 16px 16px", borderTop:`1px solid ${DS.border}` }}>
                        {/* スコア3軸 */}
                        {sc && (
                          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginTop:12, marginBottom:16 }}>
                            {[
                              { label:"案件進行", score:sc.score.drive, color:DS.indigo },
                              { label:"顧客関係", score:sc.score.involvement, color:DS.indigo },
                              { label:"対応速度", score:sc.score.speed, color:DS.emerald },
                            ].map(axis=>(
                              <div key={axis.label} style={{ padding:"10px 12px", background:DS.beige, borderRadius:DS.radiusSm }}>
                                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                                  <span style={{ fontSize:11, fontWeight:500 }}>{axis.label}</span>
                                  <span style={{ fontSize:16, fontWeight:700, color:axis.color }}>{axis.score}</span>
                                </div>
                                <div style={{ width:"100%", height:5, background:DS.border, borderRadius:3, overflow:"hidden" }}>
                                  <div style={{ width:`${axis.score*10}%`, height:"100%", background:axis.color, borderRadius:3 }}/>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 個人目標 */}
                        <div style={{ marginBottom:12 }}>
                          <div style={{ fontSize:12, fontWeight:600, color:DS.text2, marginBottom:8, display:"flex", alignItems:"center", gap:4 }}>
                            <Target size={14} strokeWidth={1.5} color={DS.indigo}/> 個人目標（{CURRENT_MONTH}月）
                          </div>
                          {goal ? (
                            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                              <div>
                                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4, fontSize:11 }}>
                                  <span style={{ color:DS.text2 }}>売上目標 ¥{goal.salesTarget.toLocaleString()}</span>
                                  <span style={{ fontWeight:600, color:barColor(salesPct) }}>{salesPct}%</span>
                                </div>
                                <div style={{ width:"100%", height:6, background:DS.border, borderRadius:3, overflow:"hidden" }}>
                                  <div style={{ width:`${Math.min(salesPct,100)}%`, height:"100%", background:barColor(salesPct), borderRadius:3 }}/>
                                </div>
                              </div>
                              <div>
                                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4, fontSize:11 }}>
                                  <span style={{ color:DS.text2 }}>契約目標 {goal.contractTarget}件</span>
                                  <span style={{ fontWeight:600, color:barColor(contractPct) }}>{contractPct}%</span>
                                </div>
                                <div style={{ width:"100%", height:6, background:DS.border, borderRadius:3, overflow:"hidden" }}>
                                  <div style={{ width:`${Math.min(contractPct,100)}%`, height:"100%", background:barColor(contractPct), borderRadius:3 }}/>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div style={{ fontSize:11, color:DS.text3 }}>目標未設定 — 詳細→から設定できます</div>
                          )}
                        </div>

                        {/* 担当顧客一覧（簡易） */}
                        {myCustomers.length > 0 && (
                          <div>
                            <div style={{ fontSize:12, fontWeight:600, color:DS.text2, marginBottom:6 }}>担当顧客</div>
                            <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                              {myCustomers.slice(0,8).map(c=>{
                                const st = STATUS_STYLE[c.status]||{bg:DS.border,text:"#64748B"};
                                return <span key={c.id} style={{ fontSize:10, padding:"3px 8px", borderRadius:4, background:st.bg, color:st.text, fontWeight:500 }}>{c.name}</span>;
                              })}
                              {myCustomers.length > 8 && <span style={{ fontSize:10, color:DS.text3, padding:"3px 4px" }}>...他{myCustomers.length-8}件</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ===== 営業マン詳細 ===== */}
      {tab==="team" && selectedMember && selectedM && (
        <div>
          <button onClick={()=>setSelectedMember(null)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:13, color:DS.text2, marginBottom:16, padding:0 }}>← 一覧に戻る</button>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:"1.5rem" }}>
            <div style={{ width:52, height:52, borderRadius:"50%", background:selectedM.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:500, color:selectedM.color }}>{displayStaffName(selectedM.name)[0]}</div>
            <div>
              <div style={{ fontSize:20, fontWeight:500 }}>{displayStaffName(selectedM.name)}</div>
              <div style={{ fontSize:13, color:DS.text2 }}>今月契約率 {(selectedM.monthlyRate[selectedM.monthlyRate.length-1]||0).toFixed(1)}%{staffScores && (()=>{ const sc=staffScores.find(s=>s.staff===selectedM.name); return sc ? `　／　スコア ${sc.score.total}/10` : ""; })()}</div>
            </div>
          </div>

          {/* スコアカード */}
          {(()=>{
            const sc = staffScores ? staffScores.find(s=>s.staff===selectedM.name) : null;
            return (
              <>
                {sc && (
                  <Card style={{ marginBottom:20 }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                      <div>
                        <span style={{ fontSize:14, fontWeight:700 }}>総合スコア：</span>
                        <span style={{ fontSize:28, fontWeight:700, color:sc.score.total>=7?DS.emerald:sc.score.total>=5?DS.orange:DS.rose }}>{sc.score.total}</span>
                        <span style={{ fontSize:14, color:DS.text2 }}> / 10</span>
                      </div>
                      {sc.avgReplyMin !== null && <div style={{ fontSize:12, color:DS.text2 }}>推定返信速度: {sc.avgReplyMin}分</div>}
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
                      {[
                        { label:"案件進行", score:sc.score.drive, weight:"40%", color:DS.indigo },
                        { label:"顧客関係", score:sc.score.involvement, weight:"35%", color:DS.indigo },
                        { label:"対応速度", score:sc.score.speed, weight:"25%", color:DS.emerald },
                      ].map(axis=>(
                        <div key={axis.label} style={{ padding:"12px 14px", background:DS.beige, borderRadius:DS.radiusSm }}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                            <span style={{ fontSize:12, fontWeight:500 }}>{axis.label}</span>
                            <span style={{ fontSize:11, color:DS.text2 }}>{axis.weight}</span>
                          </div>
                          <div style={{ fontSize:22, fontWeight:700, color:axis.color, marginBottom:6 }}>{axis.score}</div>
                          <div style={{ width:"100%", height:6, background:DS.border, borderRadius:3, overflow:"hidden" }}>
                            <div style={{ width:`${axis.score*10}%`, height:"100%", background:axis.color, borderRadius:3 }}/>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* KPI 個人サマリー */}
                <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:"1.5rem" }}>
                  {[
                    { label:"個人契約率", value:`${(selectedM.monthlyRate[selectedM.monthlyRate.length-1]||0).toFixed(1)}%`, alert:(selectedM.monthlyRate[selectedM.monthlyRate.length-1]||0)<35 },
                    { label:"担当顧客",   value:`${mc.filter(c=>c.assigned===selectedM.name).length}名`, alert:false },
                    { label:"今月売上",   value:`${calcContractRevenue(mc.filter(c=>c.assigned===selectedM.name)).toLocaleString()}円`, alert:false },
                    { label:"契約数",     value:`${contractedInMonth(selectedMonth, customers.filter(c=>c.assigned===selectedM.name))}件`, alert:false },
                    { label:"未返信",     value:`${sc ? sc.overdueCount : 0}件`, alert:sc && sc.overdueCount > 0 },
                  ].map(c=>(
                    <div key={c.label} style={{ background:c.alert?"#FFF1F2":DS.hover, borderRadius:DS.radiusSm, padding:"1rem 1.25rem", flex:1, minWidth:100 }}>
                      <div style={{ fontSize:12, color:c.alert?DS.rose:"#64748B", marginBottom:4 }}>{c.label} {c.alert?"":" "}</div>
                      <div style={{ fontSize:22, fontWeight:500, color:c.alert?DS.rose:DS.text1 }}>{c.value}</div>
                    </div>
                  ))}
                </div>

                {/* 個人目標 */}
                {(()=>{
                  const currentMonth = `${CURRENT_YEAR}-${String(CURRENT_MONTH).padStart(2,"0")}`;
                  const goal = goals.find(g => g.staff === selectedM.name && g.month === currentMonth);
                  const isEditing = goalEditing && goalEditing.staff === selectedM.name;
                  const monthRevenue = calcContractRevenue(mc.filter(c=>c.assigned===selectedM.name));
                  const monthContracts = contractedInMonth(selectedMonth, customers.filter(c=>c.assigned===selectedM.name));
                  const salesPct = goal && goal.salesTarget > 0 ? Math.min(Math.round(monthRevenue / goal.salesTarget * 100), 200) : 0;
                  const contractPct = goal && goal.contractTarget > 0 ? Math.min(Math.round(monthContracts / goal.contractTarget * 100), 200) : 0;
                  const barColor = pct => pct >= 100 ? DS.emerald : pct >= 70 ? DS.orange : DS.rose;
                  return (
                    <Card style={{ marginBottom:16 }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <Target size={16} strokeWidth={1.5} color={DS.indigo} />
                          <span style={{ fontSize:14, fontWeight:700 }}>個人目標（{CURRENT_MONTH}月）</span>
                        </div>
                        {!isEditing && (
                          <button onClick={()=>setGoalEditing({ staff:selectedM.name, month:currentMonth, salesTarget: goal?.salesTarget||0, contractTarget: goal?.contractTarget||0 })} style={{ background:"none", border:"none", cursor:"pointer", color:DS.text2, fontSize:12, display:"flex", alignItems:"center", gap:4 }}>
                            <Edit3 size={13} strokeWidth={1.5}/> 編集
                          </button>
                        )}
                      </div>
                      {isEditing ? (
                        <div>
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                            <div>
                              <label style={{ fontSize:11, color:DS.text2, marginBottom:4, display:"block" }}>売上目標（円）</label>
                              <input type="number" value={goalEditing.salesTarget} onChange={e=>setGoalEditing({...goalEditing, salesTarget:Number(e.target.value)})} style={{ width:"100%", padding:"8px 12px", borderRadius:DS.radiusSm, border:`1px solid ${DS.border}`, fontSize:14, fontVariantNumeric:"tabular-nums" }}/>
                            </div>
                            <div>
                              <label style={{ fontSize:11, color:DS.text2, marginBottom:4, display:"block" }}>契約目標（件）</label>
                              <input type="number" value={goalEditing.contractTarget} onChange={e=>setGoalEditing({...goalEditing, contractTarget:Number(e.target.value)})} style={{ width:"100%", padding:"8px 12px", borderRadius:DS.radiusSm, border:`1px solid ${DS.border}`, fontSize:14, fontVariantNumeric:"tabular-nums" }}/>
                            </div>
                          </div>
                          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                            <button onClick={()=>setGoalEditing(null)} style={{ padding:"6px 16px", fontSize:12, borderRadius:DS.radiusSm, border:`1px solid ${DS.border}`, background:"#fff", cursor:"pointer", color:DS.text2 }}>キャンセル</button>
                            <button onClick={()=>saveGoal(goalEditing.staff, goalEditing.month, goalEditing.salesTarget, goalEditing.contractTarget)} disabled={goalSaving} style={{ padding:"6px 16px", fontSize:12, borderRadius:DS.radiusSm, border:"none", background:DS.green, color:"#fff", cursor:"pointer", fontWeight:600, opacity:goalSaving?0.6:1 }}>{goalSaving?"保存中...":"保存"}</button>
                          </div>
                        </div>
                      ) : goal ? (
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                          <div>
                            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                              <span style={{ fontSize:12, color:DS.text2 }}>売上目標 ¥{goal.salesTarget.toLocaleString()}</span>
                              <span style={{ fontSize:12, fontWeight:600, color:barColor(salesPct) }}>実績 ¥{monthRevenue.toLocaleString()}（{salesPct}%）</span>
                            </div>
                            <div style={{ width:"100%", height:8, background:DS.border, borderRadius:4, overflow:"hidden" }}>
                              <div style={{ width:`${Math.min(salesPct,100)}%`, height:"100%", background:barColor(salesPct), borderRadius:4, transition:"width 0.3s" }}/>
                            </div>
                          </div>
                          <div>
                            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                              <span style={{ fontSize:12, color:DS.text2 }}>契約目標 {goal.contractTarget}件</span>
                              <span style={{ fontSize:12, fontWeight:600, color:barColor(contractPct) }}>実績 {monthContracts}件（{contractPct}%）</span>
                            </div>
                            <div style={{ width:"100%", height:8, background:DS.border, borderRadius:4, overflow:"hidden" }}>
                              <div style={{ width:`${Math.min(contractPct,100)}%`, height:"100%", background:barColor(contractPct), borderRadius:4, transition:"width 0.3s" }}/>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ textAlign:"center", padding:"12px 0", color:DS.text3, fontSize:13 }}>
                          目標が未設定です。「編集」ボタンから設定してください。
                        </div>
                      )}
                    </Card>
                  );
                })()}

                {/* 未返信案件リスト */}
                {sc && sc.overdueCustomers && sc.overdueCustomers.length > 0 && (
                  <Card style={{ marginBottom:16 }}>
                    <div style={{ fontSize:14, fontWeight:700, marginBottom:12, color:DS.rose }}>未返信案件（{sc.overdueCustomers.length}件）</div>
                    <table style={{ width:"100%", fontSize:13, borderCollapse:"collapse" }}>
                      <thead><tr style={{ borderBottom:`1px solid ${DS.border}` }}>
                        {["顧客名","ステータス","経過時間","閾値"].map(h=><th key={h} style={{ padding:"6px 10px", textAlign:"left", fontSize:11, color:DS.text2, fontWeight:400 }}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {sc.overdueCustomers.map((o,i)=>(
                          <tr key={i} style={{ borderBottom:`0.5px solid ${DS.border}` }}>
                            <td style={{ padding:"6px 10px", fontWeight:500 }}>{o.display_name}</td>
                            <td style={{ padding:"6px 10px" }}><Badge status={o.status}/></td>
                            <td style={{ padding:"6px 10px", color:DS.rose, fontWeight:500 }}>{o.hours}時間</td>
                            <td style={{ padding:"6px 10px", color:DS.text2 }}>{o.threshold}時間</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Card>
                )}
              </>
            );
          })()}

          {/* スコア推移 */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
            <div style={{ background:DS.card, border:`1px solid ${DS.border}`, borderRadius:DS.radius, padding:"24px", boxShadow:DS.shadow }}>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>スコア推移（週次）</div>
              <div style={{ fontSize:11, color:DS.text2, marginBottom:10 }}>3軸の推移</div>
              {(()=>{
                const myHistory = scoreHistory.filter(h=>h.staff===selectedM.name).slice(-8);
                if (myHistory.length === 0) return <div style={{ color:DS.text3, fontSize:13, padding:"20px 0", textAlign:"center" }}>データ蓄積中（週次で更新されます）</div>;
                return myHistory.map((h,i)=>(
                  <div key={i} style={{ marginBottom:10 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <span style={{ fontSize:12, color:DS.text2 }}>{h.date}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:h.total>=7?DS.emerald:h.total>=5?DS.orange:DS.rose }}>{h.total}/10</span>
                    </div>
                    <div style={{ display:"flex", gap:4 }}>
                      {[{ label:"進", val:h.drive, color:DS.indigo }, { label:"関", val:h.involvement, color:DS.indigo }, { label:"速", val:h.speed, color:DS.emerald }].map(a=>(
                        <div key={a.label} style={{ flex:1 }}>
                          <div style={{ fontSize:9, color:DS.text3, marginBottom:2 }}>{a.label}{a.val}</div>
                          <div style={{ width:"100%", height:4, background:DS.border, borderRadius:2, overflow:"hidden" }}>
                            <div style={{ width:`${a.val*10}%`, height:"100%", background:a.color, borderRadius:2 }}/>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
            <div style={{ background:DS.card, border:`1px solid ${DS.border}`, borderRadius:DS.radius, padding:"24px", boxShadow:DS.shadow }}>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>チーム比較</div>
              <div style={{ fontSize:11, color:DS.text2, marginBottom:10 }}>全担当者との比較</div>
              {staffScores && staffScores.filter(s=>s.customerCount>0).map((s,i)=>{
                const isMe = s.staff === selectedM.name;
                return (
                  <div key={s.staff} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 10px", borderRadius:DS.radiusSm, background:isMe?selectedM.bg:"transparent", marginBottom:2 }}>
                    <span style={{ fontSize:12, fontWeight:700, width:20, color:i<3?DS.amber:DS.text2 }}>{i+1}</span>
                    <span style={{ fontSize:13, fontWeight:isMe?700:400, flex:1 }}>{s.staff}</span>
                    <span style={{ fontSize:14, fontWeight:700, color:s.score.total>=7?DS.emerald:s.score.total>=5?DS.orange:DS.rose }}>{s.score.total}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ background:DS.card, border:`1px solid ${DS.border}`, borderRadius:DS.radius, padding:"24px", boxShadow:DS.shadow, marginBottom:16 }}>
            <div style={{ fontSize:14, fontWeight:700, marginBottom:12 }}>契約率の月次推移</div>
            <div style={{ position:"relative", height:200 }}><canvas ref={memberChartRef}/></div>
          </div>

          {/* 担当顧客一覧 */}
          <div style={{ background:DS.card, border:`1px solid ${DS.border}`, borderRadius:DS.radius, padding:"24px", boxShadow:DS.shadow }}>
            <div style={{ fontSize:14, fontWeight:700, marginBottom:12 }}>担当顧客一覧</div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", fontSize:13, borderCollapse:"collapse", minWidth:700 }}>
                <thead><tr style={{ borderBottom:`1px solid ${DS.border}`, background:DS.beige }}>
                  {["顧客名（Lstep）","案件名","進捗","売上見込み金","着金予定日",""].map(h=><th key={h} style={{ padding:"8px 10px", textAlign:"left", fontSize:11, color:DS.text2, fontWeight:500 }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {mc.filter(c=>c.assigned===selectedM.name).map(c=>{
                    const estimate=(c.commission||0)+(c.ad||0)+(c.otherRevenue||0);
                    const st=STATUS_STYLE[c.status]||{bg:DS.border,text:"#64748B"};
                    return (
                      <tr key={c.id} style={{ borderBottom:`1px solid ${DS.border}` }}>
                        {/* 顧客名（Lstepから） */}
                        <td style={{ padding:"8px 10px", fontWeight:500 }}>{c.name}</td>
                        {/* 案件名（友達追加情報から） */}
                        <td style={{ padding:"6px 10px" }}>
                          <input value={c.caseName||""} onChange={e=>updateField(c.id,"caseName",e.target.value)} placeholder="友達追加情報から" style={{ fontSize:12, padding:"4px 8px", borderRadius:4, border:`1px solid ${DS.border}`, background:"#fff", color:DS.text1, width:140 }} onFocus={e=>e.target.style.border="0.5px solid #E2E8F0"} onBlur={e=>e.target.style.border="0.5px solid transparent"}/>
                        </td>
                        {/* 進捗（対応マークから） */}
                        <td style={{ padding:"6px 10px" }}>
                          <select value={c.status} onChange={e=>{ updateField(c.id,"status",e.target.value); showToast("進捗を更新しました"); }} style={{ fontSize:11, padding:"4px 8px", borderRadius:4, border:"none", background:st.bg, color:st.text, fontWeight:500, cursor:"pointer" }}>
                            {STATUSES.map(s=><option key={s}>{s}</option>)}
                          </select>
                        </td>
                        {/* 売上見込み金（友達情報から） */}
                        <td style={{ padding:"8px 10px", fontWeight:500, color:estimate>0?DS.text1:"#64748B" }}>
                          {estimate>0?`${estimate.toLocaleString()}円`:"0円"}
                        </td>
                        {/* 着金予定日（カレンダー選択） */}
                        <td style={{ padding:"6px 10px" }}>
                          <input type="date" value={c.paymentDate||""} onChange={e=>{ updateField(c.id,"paymentDate",e.target.value); showToast("着金予定日を更新しました"); }} style={{ fontSize:12, padding:"4px 8px", borderRadius:4, border:`1px solid ${DS.border}`, background:DS.beige, color:DS.text1 }}/>
                        </td>
                        <td style={{ padding:"6px 10px" }}>
                          <button onClick={()=>{ setTab("customers"); }} style={{ fontSize:11, background:"none", border:"none", cursor:"pointer", color:DS.text2 }}>詳細→</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── 個人ファネル ── */}
          {(()=>{
            const myPool = mc.filter(c=>c.assigned===selectedM.name);
            const FUNNEL_STAGES = PIPELINE_ORDER;
            const fCounts = FUNNEL_STAGES.map(stage=>({ stage, count: myPool.filter(c=>c.status===stage).length }));
            const myLost = myPool.filter(c=>c.status==="失注（離脱中・シナリオ配信中）").length;
            return (
              <Card style={{ marginBottom:16 }}>
                <div style={{ fontSize:14, fontWeight:700, marginBottom:12 }}>{displayStaffName(selectedM.name)}の移行率ファネル</div>
                <div style={{ overflowX:"auto" }}>
                  <div style={{ display:"flex", alignItems:"flex-start", gap:0, minWidth:fCounts.length*110 }}>
                    {fCounts.map((f,i)=>{
                      const st = STATUS_STYLE[f.stage] || { bg:DS.border, text:"#64748B" };
                      const nextCount = i < fCounts.length-1 ? fCounts[i+1].count : null;
                      const convRate = f.count > 0 && nextCount !== null ? Math.round((nextCount / f.count) * 100) : null;
                      return (
                        <div key={f.stage} style={{ display:"flex", alignItems:"flex-start" }}>
                          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", minWidth:90 }}>
                            <div style={{ padding:"10px 12px", background:st.bg, borderRadius:DS.radius, display:"flex", flexDirection:"column", alignItems:"center", gap:3, minWidth:90, textAlign:"center" }}>
                              <span style={{ fontSize:10, fontWeight:600, color:st.text, whiteSpace:"nowrap" }}>{f.stage.length>6?f.stage.substring(0,6)+"…":f.stage}</span>
                              <span style={{ fontSize:18, fontWeight:700, color:st.text, fontVariantNumeric:"tabular-nums" }}>{f.count}<span style={{ fontSize:10 }}>人</span></span>
                            </div>
                          </div>
                          {i < fCounts.length - 1 && (
                            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"14px 4px", minWidth:36 }}>
                              <span style={{ fontSize:10, fontWeight:600, color:convRate!==null?(convRate>=60?DS.emerald:convRate>=40?DS.amber:DS.rose):DS.text3 }}>{convRate!==null?`${convRate}%`:"−"}</span>
                              <span style={{ fontSize:13, color:DS.text2 }}>→</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:12, marginTop:12, paddingTop:10, borderTop:`1px solid ${DS.border}` }}>
                    <span style={{ fontSize:12, color:DS.text2 }}>失注</span>
                    <span style={{ fontSize:14, fontWeight:600, color:DS.rose }}>{myLost}人</span>
                  </div>
                </div>
              </Card>
            );
          })()}

          {/* ── リードタイム分析 ── */}
          {(()=>{
            const myCustomers = mc.filter(c=>c.assigned===selectedM.name);
            const withLead = myCustomers.filter(c=>(c.leadTimes||[]).length>0);
            const stagePairs = [["未対応","物件提案中"],["物件提案中","審査中"],["審査中","契約済み"],["契約済み","AD着金済み"]];
            const stageAvg = stagePairs.map(([from,to])=>{
              const times = withLead.flatMap(c=>(c.leadTimes||[]).filter(l=>l.from===from&&l.to===to).map(l=>l.hours));
              return { from, to, avg: times.length?Math.round(times.reduce((a,b)=>a+b,0)/times.length):null, count:times.length };
            }).filter(s=>s.avg!==null);

            // チーム平均と比較
            const teamStagePairs = stagePairs.map(([from,to])=>{
              const times = mc.flatMap(c=>(c.leadTimes||[]).filter(l=>l.from===from&&l.to===to).map(l=>l.hours));
              return { from, to, avg: times.length?Math.round(times.reduce((a,b)=>a+b,0)/times.length):null };
            });

            const myTotalAvg = withLead.length
              ? Math.round(withLead.reduce((s,c)=>s+(c.leadTimes||[]).reduce((a,l)=>a+l.hours,0),0)/withLead.length) : null;
            const teamTotalAvg = mc.filter(c=>(c.leadTimes||[]).length>0).length
              ? Math.round(mc.filter(c=>(c.leadTimes||[]).length>0).reduce((s,c)=>s+(c.leadTimes||[]).reduce((a,l)=>a+l.hours,0),0)/mc.filter(c=>(c.leadTimes||[]).length>0).length) : null;

            const maxAvg = Math.max(...stageAvg.map(s=>s.avg), 1);

            return (
              <div style={{ marginTop:16 }}>
                {/* リードタイムサマリー */}
                <div style={{ background:DS.card, border:`1px solid ${DS.border}`, borderRadius:DS.radius, padding:"1.25rem", marginBottom:16 }}>
                  <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>個人リードタイム分析</div>
                  <div style={{ fontSize:11, color:DS.text2, marginBottom:16 }}>友達追加 → 契約までの所要時間（ステージ別）</div>

                  {/* 総合 */}
                  <div style={{ display:"flex", gap:12, marginBottom:20 }}>
                    <div style={{ flex:1, background:selectedM.bg, borderRadius:DS.radiusSm, padding:"12px 16px" }}>
                      <div style={{ fontSize:11, color:selectedM.color, marginBottom:4 }}>個人平均リードタイム</div>
                      <div style={{ fontSize:28, fontWeight:500, color:selectedM.color }}>{myTotalAvg!==null?`${myTotalAvg}h`:"−"}</div>
                      <div style={{ fontSize:11, color:selectedM.color, opacity:0.7 }}>{myTotalAvg?`≈ 約${Math.round(myTotalAvg/24)}日`:""}</div>
                    </div>
                    <div style={{ flex:1, background:DS.beige, borderRadius:DS.radiusSm, padding:"12px 16px" }}>
                      <div style={{ fontSize:11, color:DS.text2, marginBottom:4 }}>チーム平均リードタイム</div>
                      <div style={{ fontSize:28, fontWeight:500 }}>{teamTotalAvg!==null?`${teamTotalAvg}h`:"−"}</div>
                      <div style={{ fontSize:11, color:DS.text2 }}>{teamTotalAvg?`≈ 約${Math.round(teamTotalAvg/24)}日`:""}</div>
                    </div>
                    <div style={{ flex:1, background: myTotalAvg&&teamTotalAvg&&myTotalAvg<teamTotalAvg?"#D1FAE5":"#FFF1F2", borderRadius:DS.radiusSm, padding:"12px 16px" }}>
                      <div style={{ fontSize:11, color:DS.text2, marginBottom:4 }}>チーム比較</div>
                      <div style={{ fontSize:22, fontWeight:500, color: myTotalAvg&&teamTotalAvg&&myTotalAvg<teamTotalAvg?DS.emerald:DS.rose }}>
                        {myTotalAvg&&teamTotalAvg ? `${myTotalAvg<teamTotalAvg?"▼":"▲"}${Math.abs(myTotalAvg-teamTotalAvg)}h` : "−"}
                      </div>
                      <div style={{ fontSize:11, color:DS.text2 }}>{myTotalAvg&&teamTotalAvg&&myTotalAvg<teamTotalAvg?"チームより速い":"チームより遅い"}</div>
                    </div>
                  </div>

                  {/* ステージ別ボトルネック */}
                  <div style={{ fontSize:12, fontWeight:500, marginBottom:10 }}>ステージ別リードタイム（詰まりポイント）</div>
                  {stagePairs.map(([from,to],i)=>{
                    const my = stageAvg.find(s=>s.from===from&&s.to===to);
                    const team_ = teamStagePairs.find(s=>s.from===from&&s.to===to);
                    const myVal = my?.avg??null;
                    const teamVal = team_?.avg??null;
                    const isBottleneck = myVal&&teamVal&&myVal>teamVal*1.3;
                    const barW = myVal ? Math.round((myVal/maxAvg)*100) : 0;
                    return (
                      <div key={i} style={{ marginBottom:14 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <span style={{ fontSize:12 }}>{from} → {to}</span>
                            {isBottleneck && <span style={{ fontSize:10, padding:"2px 7px", borderRadius:4, background:"#FFF1F2", color:DS.rose, fontWeight:500 }}>ボトルネック</span>}
                          </div>
                          <div style={{ display:"flex", gap:16, fontSize:12 }}>
                            <span style={{ color:selectedM.color, fontWeight:500 }}>{myVal!==null?`個人 ${myVal}h`:"データなし"}</span>
                            <span style={{ color:DS.text2 }}>{teamVal!==null?`チーム平均 ${teamVal}h`:""}</span>
                          </div>
                        </div>
                        <div style={{ position:"relative", width:"100%", height:10, background:DS.beige, borderRadius:5, overflow:"visible" }}>
                          {/* チーム平均ライン */}
                          {teamVal && <div style={{ position:"absolute", left:`${Math.round((teamVal/maxAvg)*100)}%`, top:-4, bottom:-4, width:2, background:"#D0CEC5", borderRadius:1, zIndex:1 }}/>}
                          {/* 個人バー */}
                          <div style={{ width:`${barW}%`, height:"100%", background:isBottleneck?DS.rose:selectedM.color, borderRadius:5, opacity:0.8 }}/>
                        </div>
                        <div style={{ fontSize:10, color:DS.text2, marginTop:3 }}>縦線 = チーム平均</div>
                      </div>
                    );
                  })}

                  {/* 顧客別リードタイム一覧 */}
                  <div style={{ fontSize:12, fontWeight:500, margin:"16px 0 10px" }}>担当顧客ごとのリードタイム詳細</div>
                  <table style={{ width:"100%", fontSize:12, borderCollapse:"collapse" }}>
                    <thead><tr style={{ borderBottom:`1px solid ${DS.border}`, background:DS.beige }}>
                      {["顧客名","ステージ変化履歴","累計"].map(h=><th key={h} style={{ padding:"7px 10px", textAlign:"left", fontSize:11, color:DS.text2, fontWeight:400 }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {myCustomers.map(c=>{
                        const total=(c.leadTimes||[]).reduce((s,l)=>s+l.hours,0);
                        const st=STATUS_STYLE[c.status]||{bg:DS.border,text:"#64748B"};
                        return (
                          <tr key={c.id} style={{ borderBottom:`1px solid ${DS.border}` }}>
                            <td style={{ padding:"8px 10px" }}>
                              <div style={{ fontWeight:500 }}>{c.name}</div>
                              <span style={{ fontSize:10, padding:"2px 6px", borderRadius:3, background:st.bg, color:st.text }}>{c.status}</span>
                            </td>
                            <td style={{ padding:"8px 10px" }}>
                              {(c.leadTimes||[]).length===0
                                ? <span style={{ fontSize:11, color:DS.text2 }}>まだ移行なし</span>
                                : <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                                    {(c.leadTimes||[]).map((l,j)=>(
                                      <span key={j} style={{ fontSize:11, padding:"2px 7px", borderRadius:4, background:DS.beige, color:DS.text2, whiteSpace:"nowrap" }}>
                                        {l.from}→{l.to} <b style={{ color: l.hours>24?DS.rose:DS.text1 }}>{l.hours}h</b>
                                      </span>
                                    ))}
                                  </div>
                              }
                            </td>
                            <td style={{ padding:"8px 10px", fontWeight:500, color:total>0?DS.indigo:"#64748B" }}>
                              {total>0?`${total}h`:"−"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 返信スピード × リードタイム 相関図 */}
                <div style={{ background:DS.card, border:`1px solid ${DS.border}`, borderRadius:DS.radius, padding:"1.25rem", marginBottom:16 }}>
                  <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>返信スピード × リードタイム　相関図</div>
                  <div style={{ fontSize:11, color:DS.text2, marginBottom:6 }}>返信が速い人ほどリードタイムが短い傾向があるか（チーム全員のデータ）</div>
                  <div style={{ fontSize:11, color:selectedM.color, marginBottom:12, fontWeight:500 }}>● 大きい点 = {displayStaffName(selectedM.name)}さんの担当顧客</div>
                  <div style={{ position:"relative", height:260 }}><canvas ref={scatterChartRef}/></div>
                  <div style={{ fontSize:11, color:DS.text2, marginTop:10 }}>
                    ※ X軸: 担当者の平均返信スピード（分）　Y軸: 顧客ごとの累計リードタイム（時間）
                  </div>
                </div>

                {/* 個人移行率 */}
                <div style={{ background:DS.card, border:`1px solid ${DS.border}`, borderRadius:DS.radius, padding:"1.25rem", marginBottom:16 }}>
                  <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>{displayStaffName(selectedM.name)}さんの移行率</div>
                  <div style={{ fontSize:11, color:DS.text2, marginBottom:12 }}>担当顧客のステージ移行率</div>
                  {PIPELINE_ORDER.slice(0,-1).map((from,i)=>{
                    const to = PIPELINE_ORDER[i+1];
                    const fromIdx = PIPELINE_ORDER.indexOf(from);
                    const toIdx = PIPELINE_ORDER.indexOf(to);
                    const myCustomers = mc.filter(c=>c.assigned===selectedM.name);
                    const inFrom = myCustomers.filter(c=>{ const ci=PIPELINE_ORDER.indexOf(c.status); return ci>=fromIdx && c.status!=="失注（離脱中・シナリオ配信中）"; }).length;
                    const inTo = myCustomers.filter(c=>{ const ci=PIPELINE_ORDER.indexOf(c.status); return ci>=toIdx && c.status!=="失注（離脱中・シナリオ配信中）"; }).length;
                    const rate = inFrom>0 ? Math.round((inTo/inFrom)*100) : 0;
                    return (
                      <div key={from+to} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                        <span style={{ fontSize:11, minWidth:70, padding:"2px 6px", borderRadius:3, background:STATUS_STYLE[from].bg, color:STATUS_STYLE[from].text, fontWeight:500 }}>{from}</span>
                        <span style={{ fontSize:11, color:DS.text2 }}>→</span>
                        <div style={{ flex:1, height:8, background:DS.beige, borderRadius:4, overflow:"hidden" }}>
                          <div style={{ width:`${rate}%`, height:"100%", background:rate>=60?DS.emerald:rate>=40?DS.indigo:DS.rose, borderRadius:4 }}/>
                        </div>
                        <span style={{ fontSize:13, fontWeight:600, minWidth:36, color:rate>=60?DS.emerald:rate>=40?DS.indigo:DS.rose }}>{rate}%</span>
                        <span style={{ fontSize:11, minWidth:70, padding:"2px 6px", borderRadius:3, background:STATUS_STYLE[to].bg, color:STATUS_STYLE[to].text, fontWeight:500 }}>{to}</span>
                      </div>
                    );
                  })}
                </div>

                {/* PDCAメモ */}
                <div style={{ background:DS.card, border:`1px solid ${DS.border}`, borderRadius:DS.radius, padding:"1.25rem" }}>
                  <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>PDCAメモ</div>
                  <div style={{ fontSize:11, color:DS.text2, marginBottom:16 }}>上記データをもとに自分でPDCAを記録してください</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                    {[
                      { key:"plan", label:"Plan（目標・計画）",    color:DS.indigo, bg:"#EEF2FF", placeholder:"今月達成したい目標や取り組む施策を書く" },
                      { key:"do",   label:"Do（実行したこと）",    color:DS.emerald, bg:"#D1FAE5", placeholder:"実際にやったことを記録する" },
                      { key:"check",label:"Check（振り返り）",     color:DS.amber, bg:"#FEF3C7", placeholder:"数字を見て気づいたことを書く" },
                      { key:"act",  label:"Act（改善アクション）", color:DS.indigo, bg:"#EEF2FF", placeholder:"次月に向けて変えることを書く" },
                    ].map(item=>(
                      <div key={item.key} style={{ background:item.bg, borderRadius:DS.radiusSm, padding:"12px 14px" }}>
                        <div style={{ fontSize:12, fontWeight:500, color:item.color, marginBottom:8 }}>{item.label}</div>
                        <textarea
                          value={(pdcaNotes[selectedM.name]||{})[item.key]||""}
                          onChange={e=>setPdcaNotes(prev=>({...prev,[selectedM.name]:{...(prev[selectedM.name]||{}),[item.key]:e.target.value}}))}
                          placeholder={item.placeholder}
                          rows={3}
                          style={{ width:"100%", fontSize:12, padding:"8px 10px", borderRadius:6, border:`1px solid ${DS.border}`, background:"#fff", color:DS.text1, resize:"vertical", boxSizing:"border-box", outline:"none", fontFamily:"inherit" }}
                          onFocus={e=>e.target.style.border="0.5px solid "+item.color}
                          onBlur={e=>{ e.target.style.border="0.5px solid transparent"; showToast("PDCAメモを保存しました"); }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
      </div>{/* /コンテンツ */}
      </div>{/* /メインエリア */}
    </div>
  );
}
