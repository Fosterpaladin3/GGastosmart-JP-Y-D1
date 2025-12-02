// Front-end/react-app/src/components/Alertas.jsx
import React, { useState } from "react";
import { apiService } from "../services/apiService";

export default function Alertas({ dateFrom = null, dateTo = null }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  const formatMoney = (n) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
    }).format(n || 0);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiService.transactions.getStats(dateFrom, dateTo);

      setStats({
        total_income: Number(data.total_income ?? 0),
        total_expense: Number(data.total_expense ?? 0),
        balance: Number(data.balance ?? 0),
      });
    } catch (err) {
      console.error("Alertas - error al obtener stats:", err);

      const message =
        err?.response?.data?.detail ||
        err?.response?.statusText ||
        err?.message ||
        "Error desconocido al obtener estadísticas";

      setError(`Error: ${message}`);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) await fetchStats();
  };

  const totalIncome = stats?.total_income ?? 0;
  const totalExpense = stats?.total_expense ?? 0;
  const balance = stats?.balance ?? totalIncome - totalExpense;

  return (
    <>
      <button
        onClick={toggle}
        style={{
          backgroundColor: "black",
          color: "white",
          padding: "8px 14px",
          borderRadius: 6,
          border: "none",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        Alertas
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            right: 20,
            top: 80,
            width: 360,
            background: "#fff",
            padding: 16,
            boxShadow: "0 6px 24px rgba(0,0,0,0.12)",
            borderRadius: 8,
            zIndex: 9999,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3 style={{ margin: 0 }}>Alertas financieras</h3>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                fontSize: 18,
              }}
            >
              ×
            </button>
          </div>

          <div style={{ marginTop: 12 }}>
            {loading ? (
              <p>Cargando datos...</p>
            ) : error ? (
              <p style={{ color: "crimson" }}>{error}</p>
            ) : stats ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>Ingresos</div>
                  <div style={{ fontWeight: 700 }}>{formatMoney(totalIncome)}</div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>Gastos</div>
                  <div style={{ fontWeight: 700 }}>{formatMoney(totalExpense)}</div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <div>Balance</div>
                  <div style={{ fontWeight: 800 }}>{formatMoney(balance)}</div>
                </div>

                {totalExpense > totalIncome && (
                  <div
                    style={{
                      background: "#fff3cd",
                      padding: 10,
                      borderRadius: 6,
                      marginBottom: 8,
                    }}
                  >
                    ⚠️ Los gastos superan a los ingresos.
                  </div>
                )}

                {balance < 0 && (
                  <div
                    style={{
                      background: "#f8d7da",
                      padding: 10,
                      borderRadius: 6,
                      marginBottom: 8,
                    }}
                  >
                    ❌ El balance general es negativo.
                  </div>
                )}

                {!(totalExpense > totalIncome) && balance >= 0 && (
                  <div
                    style={{
                      background: "#d1e7dd",
                      padding: 10,
                      borderRadius: 6,
                      marginBottom: 8,
                    }}
                  >
                    ✅ Todo está en orden.
                  </div>
                )}
              </>
            ) : (
              <p>No hay datos disponibles.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
