"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";

export type SignatureHandle = { clear: () => void; toDataUrl: () => string | null; isEmpty: () => boolean };

/** Lienzo para firmar con el dedo o el lápiz. Entrega un PNG pequeño (fondo blanco) y sabe si está vacío. */
export function SignaturePad({ label, clearLabel, handleRef, onChange }: { label: string; clearLabel: string; handleRef?: Ref<SignatureHandle>; onChange?: (empty: boolean) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(true);

  // Resolución fija y pequeña (el PNG pesa unos KB); el CSS lo escala al ancho disponible.
  useEffect(() => {
    const c = canvas.current!;
    c.width = 600;
    c.height = 220;
    const g = c.getContext("2d")!;
    g.fillStyle = "#fff";
    g.fillRect(0, 0, c.width, c.height);
    g.lineWidth = 3;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.strokeStyle = "#0b1f18";
  }, []);

  const point = (e: React.PointerEvent) => {
    const c = canvas.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  };
  const start = (e: React.PointerEvent) => {
    e.preventDefault();
    canvas.current!.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = point(e);
    // Un toque sin arrastrar deja un punto.
    const g = canvas.current!.getContext("2d")!;
    g.beginPath();
    g.arc(last.current.x, last.current.y, 1.5, 0, Math.PI * 2);
    g.fillStyle = "#0b1f18";
    g.fill();
    if (empty) { setEmpty(false); onChange?.(false); }
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current || !last.current) return;
    e.preventDefault();
    const p = point(e);
    const g = canvas.current!.getContext("2d")!;
    g.beginPath();
    g.moveTo(last.current.x, last.current.y);
    g.lineTo(p.x, p.y);
    g.stroke();
    last.current = p;
  };
  const end = () => { drawing.current = false; last.current = null; };

  const clear = () => {
    const c = canvas.current!;
    const g = c.getContext("2d")!;
    g.fillStyle = "#fff";
    g.fillRect(0, 0, c.width, c.height);
    setEmpty(true);
    onChange?.(true);
  };
  useImperativeHandle(handleRef, () => ({ clear, isEmpty: () => empty, toDataUrl: () => (empty ? null : canvas.current!.toDataURL("image/png")) }), [empty]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="sig">
      <canvas ref={canvas} className="sig__pad" role="img" aria-label={label} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onPointerLeave={end} />
      <button type="button" className="sig__clear" onClick={clear} disabled={empty}>{clearLabel}</button>
    </div>
  );
}
