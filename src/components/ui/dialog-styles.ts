/**
 * Estilos compartidos por todos los modales de la plataforma (Dialog y AlertDialog de shadcn), para que se vean como una sola familia:
 * mismo velo, misma tarjeta con contorno de tinta y sombra dura, mismas esquinas y mismo ritmo de espacios.
 */
export const overlayClass =
  "fixed inset-0 z-50 bg-ink/60 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0";

export const surfaceClass =
  "fixed top-[50%] left-[50%] z-50 grid max-h-[90dvh] w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-5 overflow-y-auto rounded-(--r-lg) border-2 border-ink bg-background p-6 shadow-[var(--shadow-hard)] duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:max-w-lg sm:p-7";

export const titleClass = "font-(family-name:--font-display) text-[1.35rem] leading-tight font-black tracking-[-0.015em] text-ink";
export const descriptionClass = "text-[0.95rem] leading-relaxed text-ink-soft";
export const headerClass = "flex flex-col gap-2 pr-8 text-left";
export const footerClass = "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end [&>button]:w-full sm:[&>button]:w-auto";
