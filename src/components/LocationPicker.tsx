"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Map as LMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Dict } from "@/i18n";
import type { Located, Place } from "@/lib/geo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type PickedLocation = { lat: number; lon: number } & Located;

type Props = {
  t: Dict;
  lat: number | null;
  lon: number | null;
  /** Texto para buscar solo: lo que la IA leyó de la factura (municipio, departamento). */
  hint: string;
  place: string;
  sun: { annual: number; min: number } | null;
  onPick: (p: PickedLocation) => void;
  /** Mostrar las horas de sol del punto (solo tiene sentido para el simulador). */
  showSun?: boolean;
};

const CENTER: [number, number] = [4.6, -74.1];
const COLOMBIA: [[number, number], [number, number]] = [[-4.3, -79.1], [13.5, -66.8]];
const round = (n: number, d = 4) => Math.round(n * 10 ** d) / 10 ** d;

export function LocationPicker({ t, lat, lon, hint, place, sun, onPick, showSun = true }: Props) {
  const l = t.wiz.review.location;
  const uid = useId().replace(/:/g, "");
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<LMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const pick = useRef<(la: number, lo: number, zoom?: number) => void>(() => {});
  const [query, setQuery] = useState(hint);
  const [results, setResults] = useState<Place[]>([]);
  const [status, setStatus] = useState<"idle" | "searching" | "locating" | "error" | "empty" | "denied">("idle");

  const locate = useCallback(
    async (la: number, lo: number, zoom?: number) => {
      setStatus("locating");
      marker.current?.setLatLng([la, lo]);
      if (zoom) map.current?.setView([la, lo], zoom);
      const res = await fetch(`/api/geo/locate?lat=${la}&lon=${lo}`).catch(() => null);
      if (!res?.ok) { setStatus("error"); onPick({ lat: la, lon: lo, sun: null, municipality: null, department: null }); return; }
      setStatus("idle");
      onPick({ lat: la, lon: lo, ...((await res.json()) as Located) });
    },
    [onPick],
  );
  pick.current = (la, lo, z) => { void locate(la, lo, z); };

  // Mapa (Leaflet toca `window`, por eso se carga en el cliente).
  useEffect(() => {
    let off = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (off || !box.current || map.current) return;
      const m = L.map(box.current, { scrollWheelZoom: false });
      if (lat != null && lon != null) m.setView([lat, lon], 11);
      else m.fitBounds(COLOMBIA); // sin punto aún: se encuadra Colombia, sin importar el ancho del mapa
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(m);
      const icon = L.divIcon({ className: "loc__pin", iconSize: [22, 22], iconAnchor: [11, 11] });
      const mk = L.marker(lat != null && lon != null ? [lat, lon] : CENTER, { icon, draggable: true, keyboard: false, opacity: lat != null ? 1 : 0 }).addTo(m);
      mk.on("dragend", () => { const p = mk.getLatLng(); pick.current(round(p.lat), round(p.lng)); });
      m.on("click", (e) => { mk.setOpacity(1); pick.current(round(e.latlng.lat), round(e.latlng.lng)); });
      map.current = m;
      marker.current = mk;
    })();
    return () => { off = true; map.current?.remove(); map.current = null; marker.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function search(q: string) {
    if (q.trim().length < 3) return;
    setStatus("searching");
    const res = await fetch(`/api/geo/search?q=${encodeURIComponent(q.trim())}`).catch(() => null);
    if (!res?.ok) { setStatus("error"); return; }
    const found = (await res.json()) as Place[];
    setResults(found);
    setStatus(found.length ? "idle" : "empty");
    if (found.length === 1) choose(found[0]);
  }
  function choose(p: Place) {
    setResults([]);
    marker.current?.setOpacity(1);
    void locate(round(p.lat), round(p.lon), 11);
  }

  // Con lo que se leyó de la factura se busca solo, una vez.
  const auto = useRef(false);
  useEffect(() => {
    if (auto.current || lat != null || hint.trim().length < 3) return;
    auto.current = true;
    void search(hint);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function here() {
    if (!navigator.geolocation) { setStatus("denied"); return; }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (p) => { marker.current?.setOpacity(1); void locate(round(p.coords.latitude), round(p.coords.longitude), 12); },
      () => setStatus("denied"),
      { timeout: 10_000 },
    );
  }

  return (
    <div className="loc">
      <div className="loc__search" role="search">
        <label htmlFor={`${uid}q`}>{l.search}</label>
        <div className="loc__row">
          <Input id={`${uid}q`} value={query} maxLength={100} placeholder={l.placeholder} autoComplete="off" onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void search(query); } }} />
          <Button type="button" variant="outline" onClick={() => search(query)}>{l.find}</Button>
          <Button type="button" variant="outline" onClick={here}>{l.here}</Button>
        </div>
        {results.length > 1 && (
          <ul className="loc__results" aria-label={l.results}>
            {results.map((r) => <li key={`${r.lat},${r.lon}`}><button type="button" onClick={() => choose(r)}>{r.label}</button></li>)}
          </ul>
        )}
      </div>
      <div ref={box} className="loc__map" role="application" aria-label={l.mapLabel} />
      <p className="wiz__hint" role="status" aria-live="polite">
        {status === "searching" || status === "locating" ? l.loading
          : status === "empty" ? l.empty
          : status === "denied" ? l.denied
          : status === "error" ? l.error
          : lat == null ? l.instructions
          : <>
              <strong>{place || l.selected}</strong>
              {!showSun ? null : sun ? ` · ${l.sun.replace("{h}", String(sun.annual).replace(".", ",")).replace("{min}", String(sun.min).replace(".", ","))}` : ` · ${l.noSun}`}
            </>}
      </p>
    </div>
  );
}
