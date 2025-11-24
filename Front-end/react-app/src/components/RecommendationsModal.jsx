// src/components/RecommendationsModal.jsx
import React, { useState, useEffect, useCallback } from "react";
import styled from "styled-components";
import axios from "axios";

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
`;

const Modal = styled.div`
  width: 90%;
  max-width: 720px;
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.2);
  max-height: 80vh;
  overflow: auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.h3`
  margin: 0;
`;

const Close = styled.button`
  background: transparent;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
`;

const RecItem = styled.div`
  border-left: 4px solid #222;
  padding: 12px;
  margin: 12px 0;
  border-radius: 6px;
`;

const MetaRow = styled.div`
  display:flex;
  gap:8px;
  align-items:center;
  margin-top:6px;
`;

export default function RecommendationsModal({ open, onClose, token: tokenProp }) {
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [applyingId, setApplyingId] = useState(null);

  // obtener token: preferir prop, luego localStorage (ajusta la key si usas otro nombre)
  const token = tokenProp || (typeof window !== 'undefined' && localStorage.getItem('token')) || null;

  const apiClient = axios.create({
    baseURL: '/api', // si tu backend expone /api como prefijo; ajusta si es diferente
    timeout: 10000,
  });

  // helper para headers
  const authHeaders = () => (token ? { Authorization: `Bearer ${token}` } : {});

  const normalizeResponse = (data) => {
    // Acepta: { recommendations: [...] } o lista directa
    let items = [];
    if (!data) return [];
    if (Array.isArray(data)) items = data;
    else if (Array.isArray(data.recommendations)) items = data.recommendations;
    else if (Array.isArray(data.items)) items = data.items;

    return items.map((r, idx) => {
      if (typeof r === 'string') return {
        id: `s-${idx}`,
        type: 'generic',
        title: r,
        detail: r,
        score: null,
        suggested_action: null
      };
      return {
        id: r.id || r._id || r.type + '-' + idx,
        type: r.type || 'generic',
        title: r.title || r.detail || 'Recomendación',
        detail: r.detail || r.title || '',
        score: r.score ?? null,
        suggested_action: r.suggested_action ?? null,
        raw: r
      };
    });
  };

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/recommendations/', { headers: authHeaders() });
      const items = normalizeResponse(res.data);
      setRecs(items);
    } catch (err) {
      console.error('Error fetching recommendations', err);
      // si es 401, dar mensaje específico
      if (err.response && err.response.status === 401) {
        setError('No autenticado. Inicia sesión para ver recomendaciones.');
      } else {
        setError('No se pudieron cargar recomendaciones. Intenta refrescar.');
      }
      setRecs([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!open) return;
    // solo fetch si no tenemos datos o hubo error
    fetchRecommendations();
  }, [open]);

  const applyRecommendation = async (rec) => {
    // intenta llamar POST /recommendations/apply con el objeto de recomendación
    setApplyingId(rec.id);
    setError(null);
    try {
      const payload = {
        // adapta el payload según tu modelo pydantic ApplyRecommendationRequest
        recommendation: rec.raw || { type: rec.type, title: rec.title, detail: rec.detail }
      };
      const res = await apiClient.post('/recommendations/apply', payload, { headers: authHeaders() });
      // si el backend responde con éxito, puedes mostrar mensaje o actualizar UI
      // aquí reemplazamos el item aplicado por una versión con mensaje de éxito
      setRecs(prev => prev.map(r => r.id === rec.id ? { ...r, applied: true, applyResult: res.data } : r));
    } catch (err) {
      console.error('Error applying recommendation', err);
      setError('No se pudo aplicar la recomendación. Intenta de nuevo.');
    } finally {
      setApplyingId(null);
    }
  };

  const handleRefresh = () => fetchRecommendations();

  if (!open) return null;

  return (
    <Overlay onMouseDown={onClose}>
      <Modal onMouseDown={(e)=>e.stopPropagation()} aria-modal>
        <Header>
          <Title>Recomendaciones</Title>
          <div style={{display:'flex', gap:8, alignItems:'center'}}>
            <button onClick={handleRefresh} title="Refrescar" style={{padding:'6px 10px', borderRadius:6}}>Refrescar</button>
            <Close onClick={onClose} aria-label="Cerrar">✕</Close>
          </div>
        </Header>

        {loading && <p>Cargando recomendaciones…</p>}
        {error && <p style={{color:'crimson'}}>{error}</p>}

        {!loading && !error && recs.length === 0 && (
          <div>
            <p>No hay recomendaciones por ahora.</p>
            <p style={{fontSize:12, color:'#555'}}>Consejo: registra ingresos y gastos o configura metas para recibir recomendaciones personalizadas.</p>
          </div>
        )}

        {!loading && recs.map((r, idx) => (
          <RecItem key={r.id || idx}>
            <h4 style={{margin:0}}>{r.title}</h4>
            <p style={{margin: '6px 0 0'}}>{r.detail}</p>
            <MetaRow>
              {r.score !== null && <small>Score: {r.score}</small>}
              {r.suggested_action && <small> • Acción sugerida: {r.suggested_action}</small>}
              {r.applied && <small style={{color:'green'}}> • Aplicada</small>}
            </MetaRow>

            <div style={{textAlign:'right', marginTop:8}}>
              {!r.applied && r.suggested_action && (
                <button
                  onClick={() => applyRecommendation(r)}
                  disabled={applyingId === r.id}
                  style={{padding:'6px 10px', borderRadius:6, marginRight:8}}
                >
                  {applyingId === r.id ? 'Aplicando...' : 'Aplicar'}
                </button>
              )}
              {!r.applied && !r.suggested_action && (
                <button
                  onClick={() => applyRecommendation(r)}
                  disabled={applyingId === r.id}
                  style={{padding:'6px 10px', borderRadius:6}}
                >
                  {applyingId === r.id ? 'Aplicando...' : 'Marcar como hecho'}
                </button>
              )}
            </div>

          </RecItem>
        ))}

        <div style={{textAlign: "right", marginTop: 12}}>
          <button onClick={onClose} style={{padding: "8px 12px", borderRadius: 6}}>Cerrar</button>
        </div>
      </Modal>
    </Overlay>
  );
}
