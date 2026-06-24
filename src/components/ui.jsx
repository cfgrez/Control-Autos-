import React from "react";

export function Badge({ children, tipo = "neutro" }) {
  return <span className={`badge badge-${tipo}`}>{children}</span>;
}

export function Campo({ label, hint, children }) {
  return (
    <label className="campo">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function Card({ children, className = "" }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function Stat({ titulo, valor, subtitulo, tono = "" }) {
  return (
    <Card className={`stat ${tono}`}>
      <p>{titulo}</p>
      <strong>{valor}</strong>
      {subtitulo && <small>{subtitulo}</small>}
    </Card>
  );
}

// Estado vacío reutilizable con llamado a la acción.
export function Vacio({ titulo, children }) {
  return (
    <div className="vacio">
      <strong>{titulo}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}
