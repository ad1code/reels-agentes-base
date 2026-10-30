import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { fuentes, tema } from "../marca";

// Pieza de ejemplo: un titular que entra desde abajo. Sirve para enseñar el patrón de la biblioteca:
// - nombre de lo que es, no del reel;
// - todo lo del reel (texto, tema, tamaño, cuándo entra) llega por props, con valores por defecto;
// - colores solo de src/marca.ts;
// - animación determinista: depende del fotograma, nada de setTimeout ni CSS animado.
// Para ampliarla, solo props opcionales nuevas con valores por defecto que no cambien lo que ya sale.
export type TitularProps = {
  texto: string;
  tema?: string;
  tamano?: number; // px
  desde?: number; // fotograma en que empieza a entrar
  alinear?: "left" | "center";
};

export const Titular: React.FC<TitularProps> = ({ texto, tema: temaId, tamano = 96, desde = 0, alinear = "center" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = tema(temaId);
  const entrada = spring({ frame: frame - desde, fps, config: { damping: 200 }, durationInFrames: 12 });
  return (
    <div
      style={{
        fontFamily: fuentes.texto,
        fontSize: tamano,
        fontWeight: 700,
        lineHeight: 1.05,
        textAlign: alinear,
        color: t.texto,
        opacity: entrada,
        transform: `translateY(${interpolate(entrada, [0, 1], [30, 0])}px)`,
      }}
    >
      {texto}
    </div>
  );
};
