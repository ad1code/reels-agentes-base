import { AbsoluteFill } from "remotion";
import { fuentes, tema } from "./marca";
import type { Guion, ReelProps } from "./tipos";

// Portada del reel: el texto es el gancho, como la miniatura de un vídeo.
// Lo importante, centrado: muchas plataformas recortan la cuadrícula del perfil (por ejemplo, a 3:4).
// RELLENA: tu composición de portada (logo, firma, imagen de fondo) según docs/marca.md.
export const Portada: React.FC<ReelProps & { guion?: Guion }> = ({ guion }) => {
  const t = tema(guion?.tema);
  return (
    <AbsoluteFill style={{ background: t.fondo, color: t.texto, fontFamily: fuentes.texto, justifyContent: "center", padding: "0 120px" }}>
      <div style={{ fontSize: 120, fontWeight: 700, lineHeight: 1.02 }}>{guion?.portada}</div>
    </AbsoluteFill>
  );
};
