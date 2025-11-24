// src/components/RecommendationsModal.jsx
import React, { useState, useEffect } from "react";
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

export default function RecommendationsModal({ open, onClose }) {
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    axios.get("/recommendations") // Ajusta la base URL si hace falta
      .then(res => {
        setRecs(res.data.recommendations || []);
      })
      .catch(err => {
        setError("No se pudieron cargar recomendaciones.");
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  return (
    <Overlay onMouseDown={onClose}>
      <Modal onMouseDown={(e)=>e.stopPropagation()}>
        <Header>
          <Title>Recomendaciones</Title>
          <Close onClick={onClose} aria-label="Cerrar">✕</Close>
        </Header>

        {loading && <p>Cargando recomendaciones…</p>}
        {error && <p>{error}</p>}

        {!loading && !error && recs.length === 0 && <p>No hay recomendaciones por ahora.</p>}

        {!loading && recs.map((r, idx) => (
          <RecItem key={idx}>
            <h4 style={{margin:0}}>{r.title}</h4>
            <p style={{margin: '6px 0 0'}}>{r.detail}</p>
          </RecItem>
        ))}

        <div style={{textAlign: "right", marginTop: 12}}>
          <button onClick={onClose} style={{padding: "8px 12px", borderRadius: 6}}>Cerrar</button>
        </div>
      </Modal>
    </Overlay>
  );
}
