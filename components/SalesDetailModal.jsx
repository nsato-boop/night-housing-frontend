"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { THEME } from "../utils/colors";
import { formatYen } from "../utils/formatCurrency";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://night-housing-dashboard.onrender.com";

const STAFF_LIST = ["澤田", "中尾", "松井", "茂木", "田中和弘", "長田", "太森", "小川", "吉田", "八重柏", "太田"];

export default function SalesDetailModal({ onClose, selectedStaff, selectedPeriod, customDateRange }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [staffFilter, setStaffFilter] = useState("全担当者");
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (staffFilter !== "全担当者") params.set("staff", staffFilter);
    fetch(`${API_URL}/api/sales-detail?${params}`)
      .then(r => r.json())
      .then(d => { if (d.success !== false) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [staffFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const staffList = useMemo(() => {
    if (!data?.deals) return [];
    const set = new Set(data.deals.map(d => d.staff).filter(Boolean));
    return ["全担当者", ...Array.from(set).sort()];
  }, [data]);

  const deals = data?.deals || [];
  const summary = data?.summary || {};

  const handleSort = (key) => {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else if (sortDir === "desc") { setSortKey(null); setSortDir(null); }
    } else { setSortKey(key); setSortDir("asc"); }
  };

  const sortedDeals = useMemo(() => {
    if (!sortKey || !sortDir) return deals;
    const sorted = [...deals];
    const dir = sortDir === "asc" ? 1 : -1;
    sorted.sort((a, b) => {
      let va, vb;
      switch (sortKey) {
        case "no": return ((a.no || 0) - (b.no || 0)) * dir;
        case "staff": case "customerName":
          return ((a[sortKey] || "").localeCompare(b[sortKey] || "", "ja")) * dir;
        case "hasViewing":
          return ((a.hasViewing ? 1 : 0) - (b.hasViewing ? 1 : 0)) * dir;
        case "contractDate": case "commissionDate": case "otherDate": case "adDate":
          va = parseDate(a[sortKey]); vb = parseDate(b[sortKey]);
          if (!va && !vb) return 0; if (!va) return 1; if (!vb) return -1;
          return (va - vb) * dir;
        case "commission": case "adSales": case "otherSales": case "total":
          return ((a[sortKey] || 0) - (b[sortKey] || 0)) * dir;
        case "commissionReceived": case "adReceived": case "otherReceived":
          return ((a[sortKey] ? 1 : 0) - (b[sortKey] ? 1 : 0)) * dir;
        default: return 0;
      }
    });
    return sorted;
  }, [deals, sortKey, sortDir]);

  // ── 着金チェック更新 ──
  const handleCheckToggle = async (deal, field, column) => {
    const newValue = !deal[field];
    setData(prev => {
      if (!prev) return prev;
      return { ...prev, deals: prev.deals.map(d => d.rowNumber === deal.rowNumber ? { ...d, [field]: newValue } : d) };
    });
    try {
      const res = await fetch(`${API_URL}/api/sales-detail/update`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowNumber: deal.rowNumber, column, value: newValue }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "更新失敗");
    } catch (err) {
      setData(prev => {
        if (!prev) return prev;
        return { ...prev, deals: prev.deals.map(d => d.rowNumber === deal.rowNumber ? { ...d, [field]: !newValue } : d) };
      });
      showError(`着金更新エラー: ${err.message}`);
    }
  };

  // ── セル編集 ──
  const handleCellUpdate = async (deal, field, column, newValue) => {
    const oldValue = deal[field];
    // UI即時更新
    const updatedDeal = { ...deal, [field]: newValue };
    // 金額列なら合計再計算
    if (["commission", "adSales", "otherSales"].includes(field)) {
      updatedDeal.total = (Number(updatedDeal.commission) || 0) + (Number(updatedDeal.adSales) || 0) + (Number(updatedDeal.otherSales) || 0);
    }
    setData(prev => {
      if (!prev) return prev;
      return { ...prev, deals: prev.deals.map(d => d.rowNumber === deal.rowNumber ? updatedDeal : d) };
    });
    try {
      const res = await fetch(`${API_URL}/api/sales-detail/update-cell`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowNumber: deal.rowNumber, column, value: newValue }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "更新失敗");
    } catch (err) {
      setData(prev => {
        if (!prev) return prev;
        return { ...prev, deals: prev.deals.map(d => d.rowNumber === deal.rowNumber ? deal : d) };
      });
      showError(`更新エラー: ${err.message}`);
    }
  };

  const showError = (msg) => { setError(msg); setTimeout(() => setError(null), 5000); };
  const handleAddSuccess = () => { setShowAddForm(false); fetchData(); };

  const COLUMNS = [
    { key: "no", label: "No" },
    { key: "staff", label: "担当者", editable: "select", column: "C" },
    { key: "customerName", label: "顧客名", editable: "text", column: "D" },
    { key: "hasViewing", label: "内見" },
    { key: "contractDate", label: "契約日", editable: "date", column: "K" },
    { key: "commission", label: "仲手", editable: "number", column: "Q" },
    { key: "adSales", label: "AD", editable: "number", column: "S" },
    { key: "otherSales", label: "他", editable: "number", column: "R" },
    { key: "total", label: "合計" },
    { key: "commissionDate", label: "仲入金日", editable: "date", column: "L" },
    { key: "adDate", label: "AD入金日", editable: "date", column: "N" },
    { key: "otherDate", label: "他入金日", editable: "date", column: "M" },
    { key: "commissionReceived", label: "仲着" },
    { key: "adReceived", label: "AD着" },
    { key: "otherReceived", label: "他着" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.85)", overflowY: "auto" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ maxWidth: 1400, margin: "40px auto", padding: 24, background: THEME.bg, borderRadius: 12, minHeight: "80vh" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 18, fontWeight: 600, color: THEME.text }}>売上詳細</span>
            <select value={staffFilter} onChange={e => setStaffFilter(e.target.value)} style={selectStyle}>
              {staffList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button onClick={onClose} style={{ fontSize: 20, background: "none", border: "none", color: THEME.textSub, cursor: "pointer" }}>x</button>
        </div>

        {error && <div style={{ background: "#7F1D1D", color: "#FCA5A5", padding: "8px 12px", borderRadius: 6, marginBottom: 12, fontSize: 12 }}>{error}</div>}

        {loading ? <div style={{ textAlign: "center", padding: 60, color: THEME.textSub }}>読み込み中...</div> : (
          <>
            {/* KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
              <KpiCard label="成約件数" value={summary.totalDeals || 0} sub={formatYen(summary.totalAmount || 0)} />
              <KpiCard label="内見あり契約率" value={`${Math.round((summary.viewingContractRate || 0) * 100)}%`}
                sub={`${summary.viewingContracted || 0}/${summary.totalContracted || 0}件`} color="#5EEAD4" />
              <KpiCard label="内見なし契約率" value={`${Math.round((summary.noViewingContractRate || 0) * 100)}%`}
                sub={`${summary.noViewingContracted || 0}/${summary.totalContracted || 0}件`} color="#F59E0B" />
              <KpiCard label="審査通過率" value={`${Math.round((summary.approvalRate || 0) * 100)}%`}
                sub={`${summary.approvedCount || 0}/${summary.examTotal || 0}件`} color="#3B82F6" />
            </div>

            {/* 新規登録 */}
            <div style={{ marginBottom: 12 }}>
              <button onClick={() => setShowAddForm(true)} style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#14B8A6", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                ＋ 新規登録
              </button>
            </div>
            {showAddForm && <AddSalesForm staffList={STAFF_LIST} onClose={() => setShowAddForm(false)} onSuccess={handleAddSuccess} />}

            {/* Table */}
            <div style={{ background: THEME.card, borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${THEME.border}` }}>
                      {COLUMNS.map(col => (
                        <th key={col.key} onClick={() => handleSort(col.key)} style={{
                          padding: "8px 4px", textAlign: "left", fontWeight: 500, cursor: "pointer", userSelect: "none",
                          color: sortKey === col.key ? "#14B8A6" : THEME.textSub, transition: "color 0.15s", fontSize: 10,
                        }}
                          onMouseEnter={e => { if (sortKey !== col.key) e.target.style.color = "#14B8A6"; }}
                          onMouseLeave={e => { if (sortKey !== col.key) e.target.style.color = THEME.textSub; }}
                        >
                          {col.label}{sortKey === col.key && <span style={{ marginLeft: 2, fontSize: 9 }}>{sortDir === "asc" ? "▲" : "▼"}</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDeals.map((d, i) => (
                      <tr key={d.rowNumber || i} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                        <td style={cellStyle}>{d.no}</td>
                        <td style={cellStyle}>
                          <EditableSelect value={d.staff} options={STAFF_LIST} onSave={v => handleCellUpdate(d, "staff", "C", v)} />
                        </td>
                        <td style={{ ...cellStyle, maxWidth: 90 }}>
                          <EditableText value={d.customerName} onSave={v => handleCellUpdate(d, "customerName", "D", v)} />
                        </td>
                        <td style={cellStyle}>{d.hasViewing ? <span style={{ color: "#5EEAD4" }}>●</span> : <span style={{ color: "#555" }}>-</span>}</td>
                        <td style={cellStyle}>
                          <EditableDate value={d.contractDate} onSave={v => handleCellUpdate(d, "contractDate", "K", v)} />
                        </td>
                        <td style={{ ...cellStyle, textAlign: "right" }}>
                          <EditableNumber value={d.commission} onSave={v => handleCellUpdate(d, "commission", "Q", v)} />
                        </td>
                        <td style={{ ...cellStyle, textAlign: "right" }}>
                          <EditableNumber value={d.adSales} onSave={v => handleCellUpdate(d, "adSales", "S", v)} />
                        </td>
                        <td style={{ ...cellStyle, textAlign: "right" }}>
                          <EditableNumber value={d.otherSales} onSave={v => handleCellUpdate(d, "otherSales", "R", v)} />
                        </td>
                        <td style={{ ...cellStyle, textAlign: "right", fontWeight: 500 }}>{formatYen(d.total)}</td>
                        <td style={cellStyle}><EditableDate value={d.commissionDate} onSave={v => handleCellUpdate(d, "commissionDate", "L", v)} /></td>
                        <td style={cellStyle}><EditableDate value={d.adDate} onSave={v => handleCellUpdate(d, "adDate", "N", v)} /></td>
                        <td style={cellStyle}><EditableDate value={d.otherDate} onSave={v => handleCellUpdate(d, "otherDate", "M", v)} /></td>
                        <td style={cellStyle}><CheckBox checked={d.commissionReceived} onChange={() => handleCheckToggle(d, "commissionReceived", "H")} /></td>
                        <td style={cellStyle}><CheckBox checked={d.adReceived} onChange={() => handleCheckToggle(d, "adReceived", "J")} /></td>
                        <td style={cellStyle}><CheckBox checked={d.otherReceived} onChange={() => handleCheckToggle(d, "otherReceived", "I")} /></td>
                      </tr>
                    ))}
                    {deals.length === 0 && <tr><td colSpan={15} style={{ ...cellStyle, textAlign: "center", padding: 30, color: THEME.textSub }}>データなし</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Analysis Panel */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ background: THEME.card, borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: THEME.text, marginBottom: 10 }}>内見 x 契約率</div>
                <BarCompare label1="内見あり" value1={Math.round((summary.viewingContractRate || 0) * 100)} color1="#5EEAD4"
                  label2="内見なし" value2={Math.round((summary.noViewingContractRate || 0) * 100)} color2="#F59E0B" />
              </div>
              <div style={{ background: THEME.card, borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: THEME.text, marginBottom: 10 }}>審査通過率（担当者別）</div>
                <div style={{ maxHeight: 200, overflowY: "auto" }}>
                  {Object.entries(summary.approvalRateByStaff || {}).sort((a, b) => b[1] - a[1]).map(([name, rate]) => (
                    <div key={name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 10, color: THEME.textSub, width: 60, textAlign: "right" }}>{name}</span>
                      <div style={{ flex: 1, height: 14, background: "#222", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: `${Math.round(rate * 100)}%`, height: "100%", background: "#3B82F6", borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 10, color: THEME.text, width: 32, textAlign: "right" }}>{Math.round(rate * 100)}%</span>
                    </div>
                  ))}
                  {Object.keys(summary.approvalRateByStaff || {}).length === 0 && <div style={{ fontSize: 10, color: THEME.textSub, textAlign: "center", padding: 20 }}>データなし</div>}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Editable Components ──

function EditableText({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || "");
  const ref = useRef(null);

  useEffect(() => { setVal(value || ""); }, [value]);
  useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);

  const save = () => {
    setEditing(false);
    if (val !== (value || "")) onSave(val);
  };

  if (editing) return (
    <input ref={ref} value={val} onChange={e => setVal(e.target.value)}
      onBlur={save} onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") { setVal(value || ""); setEditing(false); } }}
      style={{ ...editInputStyle, width: "100%" }} />
  );
  return <span onClick={() => setEditing(true)} style={editableStyle}>{value || <span style={{ color: "#555" }}>-</span>}</span>;
}

function EditableNumber({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || "");
  const ref = useRef(null);

  useEffect(() => { setVal(value || ""); }, [value]);
  useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);

  const save = () => {
    setEditing(false);
    const n = Number(val) || 0;
    if (n !== (value || 0)) onSave(n);
  };

  if (editing) return (
    <input ref={ref} type="number" value={val} onChange={e => setVal(e.target.value)}
      onBlur={save} onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") { setVal(value || ""); setEditing(false); } }}
      style={{ ...editInputStyle, width: 70, textAlign: "right" }} />
  );
  return <span onClick={() => setEditing(true)} style={editableStyle}>{value > 0 ? formatYen(value) : "-"}</span>;
}

function EditableDate({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const ref = useRef(null);

  // "2026/04/15" → "2026-04-15"
  const toISO = (v) => {
    if (!v) return "";
    const m = String(v).match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    return m ? `${m[1]}-${String(m[2]).padStart(2,"0")}-${String(m[3]).padStart(2,"0")}` : "";
  };
  const [val, setVal] = useState(toISO(value));
  useEffect(() => { setVal(toISO(value)); }, [value]);
  useEffect(() => { if (editing && ref.current) { ref.current.focus(); ref.current.showPicker?.(); } }, [editing]);

  const save = () => {
    setEditing(false);
    const isoOld = toISO(value);
    if (val !== isoOld) onSave(val ? val.replace(/-/g, "/") : "");
  };

  if (editing) return (
    <input ref={ref} type="date" value={val} onChange={e => setVal(e.target.value)}
      onBlur={save} onKeyDown={e => { if (e.key === "Escape") { setVal(toISO(value)); setEditing(false); } }}
      style={{ ...editInputStyle, width: 110 }} />
  );
  return <span onClick={() => setEditing(true)} style={editableStyle}>{shortDate(value) || <span style={{ color: "#555" }}>-</span>}</span>;
}

function EditableSelect({ value, options, onSave }) {
  const [editing, setEditing] = useState(false);
  const ref = useRef(null);

  useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);

  const save = (v) => { setEditing(false); if (v !== value) onSave(v); };

  if (editing) return (
    <select ref={ref} defaultValue={value} onChange={e => save(e.target.value)} onBlur={e => save(e.target.value)}
      style={{ ...editInputStyle, width: "100%" }}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
  return <span onClick={() => setEditing(true)} style={editableStyle}>{value || "-"}</span>;
}

function CheckBox({ checked, onChange }) {
  return <input type="checkbox" checked={checked} onChange={onChange} style={{ cursor: "pointer", accentColor: "#14B8A6", width: 15, height: 15 }} />;
}

// ── AddSalesForm ──

function AddSalesForm({ staffList, onClose, onSuccess }) {
  const [form, setForm] = useState({ staff: staffList[0] || "", customerName: "", contractDate: "", adClient: "", commission: "", adSales: "", otherSales: "", commissionDate: "", otherDate: "", adDate: "" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const total = (Number(form.commission) || 0) + (Number(form.adSales) || 0) + (Number(form.otherSales) || 0);

  const handleSubmit = async () => {
    if (!form.customerName.trim()) { setFormError("顧客名を入力してください"); return; }
    if (!form.staff) { setFormError("担当者を選択してください"); return; }
    setSubmitting(true); setFormError(null);
    try {
      const res = await fetch(`${API_URL}/api/sales-detail/add`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staff: form.staff, customerName: form.customerName, contractDate: form.contractDate,
          adClient: form.adClient, commission: Number(form.commission) || 0, adSales: Number(form.adSales) || 0, otherSales: Number(form.otherSales) || 0,
          commissionDate: form.commissionDate, otherDate: form.otherDate, adDate: form.adDate }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "登録失敗");
      onSuccess();
    } catch (err) { setFormError(err.message); } finally { setSubmitting(false); }
  };

  return (
    <div style={{ background: THEME.card, borderRadius: 8, padding: 16, marginBottom: 16, border: `1px solid ${THEME.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: THEME.text }}>新規登録</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: THEME.textSub, cursor: "pointer", fontSize: 16 }}>x</button>
      </div>
      {formError && <div style={{ background: "#7F1D1D", color: "#FCA5A5", padding: "6px 10px", borderRadius: 4, marginBottom: 10, fontSize: 11 }}>{formError}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div><label style={labelStyle}>担当者 *</label><select value={form.staff} onChange={e => setForm(p => ({ ...p, staff: e.target.value }))} style={inputStyle}>{staffList.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
        <div><label style={labelStyle}>顧客名 *</label><input value={form.customerName} onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))} style={inputStyle} placeholder="山田太郎" /></div>
        <div><label style={labelStyle}>契約日</label><input type="date" value={form.contractDate} onChange={e => setForm(p => ({ ...p, contractDate: e.target.value }))} style={inputStyle} /></div>
        <div><label style={labelStyle}>AD請求先</label><input value={form.adClient} onChange={e => setForm(p => ({ ...p, adClient: e.target.value }))} style={inputStyle} placeholder="株式会社ABC" /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div><label style={labelStyle}>仲手売上</label><input type="number" value={form.commission} onChange={e => setForm(p => ({ ...p, commission: e.target.value }))} style={inputStyle} placeholder="85000" /></div>
        <div><label style={labelStyle}>AD売上</label><input type="number" value={form.adSales} onChange={e => setForm(p => ({ ...p, adSales: e.target.value }))} style={inputStyle} placeholder="66000" /></div>
        <div><label style={labelStyle}>その他売上</label><input type="number" value={form.otherSales} onChange={e => setForm(p => ({ ...p, otherSales: e.target.value }))} style={inputStyle} placeholder="33000" /></div>
        <div><label style={labelStyle}>合計（自動計算）</label><div style={{ ...inputStyle, background: THEME.card, display: "flex", alignItems: "center" }}>{formatYen(total)}</div></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div><label style={labelStyle}>仲手入金日</label><input type="date" value={form.commissionDate} onChange={e => setForm(p => ({ ...p, commissionDate: e.target.value }))} style={inputStyle} /></div>
        <div><label style={labelStyle}>AD入金予定日</label><input type="date" value={form.adDate} onChange={e => setForm(p => ({ ...p, adDate: e.target.value }))} style={inputStyle} /></div>
        <div><label style={labelStyle}>その他入金日</label><input type="date" value={form.otherDate} onChange={e => setForm(p => ({ ...p, otherDate: e.target.value }))} style={inputStyle} /></div>
        <div></div>
      </div>
      <button onClick={handleSubmit} disabled={submitting} style={{ padding: "8px 24px", borderRadius: 6, border: "none", background: submitting ? "#555" : "#14B8A6", color: "#fff", fontSize: 12, fontWeight: 600, cursor: submitting ? "default" : "pointer" }}>
        {submitting ? "登録中..." : "登録"}
      </button>
    </div>
  );
}

// ── Sub-components ──
function KpiCard({ label, value, sub, color }) {
  return (<div style={{ background: THEME.card, borderRadius: 8, padding: "10px 12px" }}><div style={{ fontSize: 10, color: THEME.textSub }}>{label}</div><div style={{ fontSize: 22, fontWeight: 600, color: color || THEME.text }}>{value}</div><div style={{ fontSize: 10, color: THEME.textSub }}>{sub}</div></div>);
}
function BarCompare({ label1, value1, color1, label2, value2, color2 }) {
  const max = Math.max(value1, value2, 1);
  return (<div>{[[label1, value1, color1], [label2, value2, color2]].map(([l, v, c]) => (<div key={l} style={{ marginBottom: 8 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: THEME.textSub, marginBottom: 2 }}><span>{l}</span><span style={{ color: c }}>{v}%</span></div><div style={{ height: 16, background: "#222", borderRadius: 4, overflow: "hidden" }}><div style={{ width: `${(v / max) * 100}%`, height: "100%", background: c, borderRadius: 4, transition: "width 0.3s" }} /></div></div>))}</div>);
}

// ── Helpers ──
function parseDate(d) { if (!d) return null; const m = String(d).match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/); if (!m) return null; return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])); }
function shortDate(d) { if (!d) return ""; const m = String(d).match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/); if (m) return `${m[2]}/${m[3]}`; return d; }

const selectStyle = { fontSize: 11, padding: "4px 8px", borderRadius: 4, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text, outline: "none", cursor: "pointer" };
const cellStyle = { padding: "5px 4px", color: THEME.text, whiteSpace: "nowrap" };
const editableStyle = { cursor: "pointer", padding: "2px 4px", borderRadius: 3, display: "inline-block", minWidth: 20, transition: "background 0.15s" };
const editInputStyle = { fontSize: 11, padding: "3px 5px", borderRadius: 3, border: `1px solid ${THEME.border}`, background: THEME.bg, color: THEME.text, outline: "none", boxSizing: "border-box" };
const inputStyle = { width: "100%", padding: "6px 8px", borderRadius: 4, border: `1px solid ${THEME.border}`, background: THEME.bg, color: THEME.text, fontSize: 12, outline: "none", boxSizing: "border-box" };
const labelStyle = { fontSize: 11, color: THEME.textSub, marginBottom: 4, display: "block" };
