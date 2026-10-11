"use client";

import { useState } from "react";

/** Imagen principal con miniaturas: al tocar una miniatura pasa a ser la principal. */
export function ProductGallery({ images, name, label }: { images: string[]; name: string; label: string }) {
  const [current, setCurrent] = useState(0);
  const main = images[Math.min(current, images.length - 1)];
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="pdetail__main" src={main} alt={name} />
      {images.length > 1 && (
        <div className="pdetail__thumbs" role="group" aria-label={label}>
          {images.map((src, i) => (
            <button key={src} type="button" className={`pdetail__thumb ${i === current ? "is-on" : ""}`} aria-pressed={i === current} aria-label={`${label} ${i + 1} / ${images.length}`} onClick={() => setCurrent(i)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading={i === 0 ? "eager" : "lazy"} />
            </button>
          ))}
        </div>
      )}
    </>
  );
}
