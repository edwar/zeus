/**
 * Video corto de apoyo en una guía. Sin audio; los subtítulos van dentro del video y el texto de la guía sigue siendo la referencia.
 * `preload="none"` + póster: no se descarga nada hasta que la persona pulsa play. WebM (VP9) primero por ser el más liviano; MP4 para
 * los navegadores que no lo reproducen. `portrait` = grabado en un celular en vertical. `base` es la ruta sin extensión: `${base}.webm`, `${base}.mp4` y `${base}.jpg`.
 */
export function GuideVideo({ base, title, portrait = false }: { base: string; title: string; portrait?: boolean }) {
  return (
    <figure className={portrait ? "gvideo gvideo--portrait" : "gvideo"}>
      <video controls preload="none" playsInline poster={`${base}.jpg`} aria-label={title} width={portrait ? 390 : 1024} height={portrait ? 760 : 576}>
        <source src={`${base}.webm`} type='video/webm; codecs="vp9"' />
        <source src={`${base}.mp4`} type="video/mp4" />
      </video>
      <figcaption>{title}</figcaption>
    </figure>
  );
}
