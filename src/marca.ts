// Tokens de la marca. Todos los colores de las piezas salen de aquí, nunca hex sueltos en un componente.
// RELLENA: tus colores, tus temas y tus tipografías (docs/marca.md). Estos valores son neutros, de relleno.

export type Tema = {
  fondo: string;
  superficie: string;
  texto: string;
  apagado: string;
  acento: string;
  tintaAcento: string; // texto sobre el acento
};

export const temas = {
  base: { fondo: "#111111", superficie: "#1c1c1c", texto: "#f2f2f2", apagado: "#8a8a8a", acento: "#4f8cff", tintaAcento: "#ffffff" },
  claro: { fondo: "#f4f4f4", superficie: "#ffffff", texto: "#151515", apagado: "#6b6b6b", acento: "#2f6fe4", tintaAcento: "#ffffff" },
} satisfies Record<string, Tema>;

export type TemaId = keyof typeof temas;
export const tema = (id?: string): Tema => temas[(id as TemaId) in temas ? (id as TemaId) : "base"];

// RELLENA: tus familias tipográficas. Para cargarlas, @remotion/google-fonts o @remotion/fonts.
export const fuentes = {
  texto: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  mono: "ui-monospace, Menlo, Consolas, monospace",
};
