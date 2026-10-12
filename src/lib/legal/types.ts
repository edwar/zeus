/** Un bloque de un documento legal. En los textos se admiten `{variables}` del responsable y enlaces `[texto](/ruta)`. */
export type Block =
  | string
  | { list: string[] }
  | { table: { head: string[]; rows: string[][] } }
  | { note: string };

export type Section = { id: string; title: string; body: Block[] };

export type LegalDoc = {
  title: string;
  /** Descripción para buscadores y para la tarjeta al compartir el enlace. */
  description: string;
  intro: string;
  /** «Última actualización» y «Versión», ya traducidos. */
  updatedLabel: string;
  versionLabel: string;
  tocLabel: string;
  /** Aviso opcional bajo el título (p. ej. «traducción de cortesía»). */
  notice?: string;
  sections: Section[];
};
