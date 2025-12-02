// src/components/RecommendationsModal.jsx
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { apiService } from "../services/apiService";
import { formatCurrency } from "../config/config";

/* Reutilizo styled-components pero lo posiciono como recuadro fijo (top-right) */
const Container = styled.div`
  position: fixed;
  right: 20px;
  top: 80px;
  width: 420px;
  max-width: calc(100% - 40px);
  background: #fff;
  padding: 14px;
  border-radius: 10px;
  box-shadow: 0 8px 36px rgba(0,0,0,0.16);
  z-index: 9999;
  max-height: 80vh;
  overflow: auto;
`;

const Header = styled.div`
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin-bottom:8px;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 1.05rem;
`;

const Close = styled.button`
  background: transparent;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
`;

const RecItem = styled.div`
  background: #f6f8fa;
  padding: 10px;
  border-radius: 8px;
  margin: 8px 0;
  line-height: 1.25;
`;

const TopCat = styled.div`
  display:flex;
  justify-content:space-between;
  margin-bottom:6px;
`;

export default function RecommendationsModal({ open, onClose, dateFrom = null, dateTo = null }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [topExpenses, setTopExpenses] = useState([]);
  const [recs, setRecs] = useState([]);

  const ensureDateRange = () => {
    if (dateFrom && dateTo) return { dateFrom, dateTo };
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const df = new Date(year, month - 1, 1).toISOString();
    const dt = new Date(year, month, 0, 23, 59, 59, 999).toISOString();
    return { dateFrom: df, dateTo: dt };
  };

  useEffect(() => {
    if (!open) return;

    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      setStats(null);
      setTopExpenses([]);
      setRecs([]);

      const { dateFrom: df, dateTo: dt } = ensureDateRange();

      try {
        // 1) traer stats (totales y balance)
        const s = await apiService.transactions.getStats(df, dt);

        // 2) traer transacciones (limit alto para agrupar por categoría)
        const txs = await apiService.transactions.getTransactions({ limit: 1000, date_from: df, date_to: dt });

        if (!mounted) return;

        const totalIncome = Number(s.total_income ?? s.income_total ?? s.ingresos ?? s.total?.income ?? 0);
        const totalExpense = Number(s.total_expense ?? s.expense_total ?? s.gastos ?? s.total?.expense ?? 0);
        const balance = Number(s.balance ?? totalIncome - totalExpense);

        setStats({ totalIncome, totalExpense, balance });

        // Agrupar gastos por categoría
        const txArray = Array.isArray(txs) ? txs : txs?.items ?? [];
        const expenseTxs = txArray.filter(t => {
          const type = (t.type ?? t.transaction_type ?? "").toString().toLowerCase();
          // Asumir que gastos pueden ser type 'expense' o monto negativo
          return type === "expense" || Number(t.amount ?? t.monto ?? 0) < 0 || type === "gasto";
        });

        const group = {};
        for (const t of expenseTxs) {
          const cat = t.category ?? "Sin categoría";
          const amt = Math.abs(Number(t.amount ?? t.monto ?? 0)) || 0;
          group[cat] = (group[cat] || 0) + amt;
        }

        const groupArr = Object.entries(group).map(([category, total]) => ({ category, total }));
        groupArr.sort((a, b) => b.total - a.total);
        const totalGrouped = groupArr.reduce((s, x) => s + x.total, 0) || totalExpense || 1;
        const top3 = groupArr.slice(0, 3).map(g => ({
          category: g.category,
          total: g.total,
          percent: Math.round((g.total / totalGrouped) * 10000) / 100
        }));
        setTopExpenses(top3);

        // Generar recomendaciones
        const recommendations = [];

        if (totalExpense > totalIncome) {
          const diff = totalExpense - totalIncome;
          recommendations.push(`Tus gastos (${formatCurrency(totalExpense)}) superan tus ingresos (${formatCurrency(totalIncome)}). Necesitas reducir gastos o aumentar ingresos en ${formatCurrency(diff)}.`);

          if (top3.length > 0) {
            recommendations.push("Sugerencias por categoría para reducir gastos:");
            top3.forEach(t => {
              const suggestedCutPercent = t.percent > 30 ? 25 : t.percent > 15 ? 15 : 10;
              const cutAmount = Math.round((t.total * suggestedCutPercent) / 100);
              recommendations.push(`- ${t.category}: reducir ~${suggestedCutPercent}% → ahorrar ~${formatCurrency(cutAmount)} (actual ${formatCurrency(t.total)}, ${t.percent}% del gasto).`);
            });
          } else {
            recommendations.push("- Revisa gastos discrecionales: comidas fuera, suscripciones, transporte, entretenimiento.");
          }

          recommendations.push(`Meta corta: reducir gastos mensuales en ${Math.round((diff / (totalExpense || 1)) * 100)}% o aumentar ingresos en ${formatCurrency(diff)}.`);
        } else {
          const surplus = totalIncome - totalExpense;
          recommendations.push(`Buen trabajo: tus ingresos (${formatCurrency(totalIncome)}) cubren tus gastos (${formatCurrency(totalExpense)}). Excedente mensual aproximado: ${formatCurrency(surplus)}.`);
          const suggestedSave = Math.round(totalIncome * 0.1);
          recommendations.push(`Sugerencia: fija una meta de ahorro del 10% de tus ingresos (${formatCurrency(suggestedSave)} / mes).`);
          const emergencyTarget = Math.round(totalExpense * 3);
          recommendations.push(`Objetivo: fondo de emergencia = 3 meses de gastos ≈ ${formatCurrency(emergencyTarget)}.`);
        }

        // Recomendaciones universales
        recommendations.push("Recomendaciones prácticas: revisar suscripciones, automatizar ahorro, y establecer metas SMART (monto/plazo/acción).");

        setRecs(recommendations);
      } catch (err) {
        console.error("Recommendations error:", err);
        setError(err?.response?.data?.detail ?? err?.message ?? "No se pudieron obtener recomendaciones.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [open, dateFrom, dateTo]);

  if (!open) return null;

  return (
    <Container role="dialog" aria-modal="true">
      <Header>
        <Title>Recomendaciones</Title>
        <Close onClick={onClose} aria-label="Cerrar">✕</Close>
      </Header>

      {loading && <p>Cargando recomendaciones…</p>}
      {error && <p style={{color: "#9b1c26"}}>{error}</p>}

      {!loading && !error && stats && (
        <>
          <div style={{marginBottom:10}}>
            <TopCat>
              <div style={{color:"#555"}}>Ingresos</div>
              <div style={{fontWeight:700}}>{formatCurrency(stats.totalIncome)}</div>
            </TopCat>
            <TopCat>
              <div style={{color:"#555"}}>Gastos</div>
              <div style={{fontWeight:700}}>{formatCurrency(stats.totalExpense)}</div>
            </TopCat>
            <TopCat>
              <div style={{color:"#333"}}>Balance</div>
              <div style={{fontWeight:700, color: stats.balance < 0 ? "#9b1c26" : "#0f5132"}}>{formatCurrency(stats.balance)}</div>
            </TopCat>
          </div>

          {topExpenses.length > 0 && (
            <div style={{marginBottom:10}}>
              <div style={{fontWeight:700, marginBottom:6}}>Principales categorías de gasto</div>
              {topExpenses.map(t => (
                <div key={t.category} style={{display:"flex", justifyContent:"space-between", marginBottom:6}}>
                  <div style={{maxWidth:"70%"}}>
                    <div style={{fontWeight:600}}>{t.category}</div>
                    <div style={{fontSize:12, color:"#666"}}>{t.percent}% del total de gastos</div>
                  </div>
                  <div style={{fontWeight:700}}>{formatCurrency(t.total)}</div>
                </div>
              ))}
            </div>
          )}

          <div>
            {recs.map((r,i) => <RecItem key={i}>{r}</RecItem>)}
          </div>

          <div style={{display:"flex", gap:8, justifyContent:"flex-end", marginTop:8}}>
            <button
              onClick={() => {
                // placeholder - podrías abrir un modal para crear meta o navegar a vista con filtro
                alert("Funcionalidad de crear meta aún no implementada.");
              }}
              style={{background:"#111", color:"#fff", padding:"8px 12px", borderRadius:6, border:"none", cursor:"pointer"}}
            >
              Crear meta sugerida
            </button>

            <button
              onClick={() => {
                // placeholder para navegar o filtrar por categoría
                alert("Navegar a transacciones (pendiente implementar).");
              }}
              style={{background:"#fff", color:"#111", padding:"8px 12px", borderRadius:6, border:"1px solid #ddd", cursor:"pointer"}}
            >
              Revisar categorías
            </button>
          </div>
        </>
      )}

      {!loading && !error && (!stats || recs.length === 0) && <p>No hay recomendaciones por ahora.</p>}
    </Container>
  );
}
