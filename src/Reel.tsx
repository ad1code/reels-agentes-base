import { Audio } from "@remotion/media";
import { createTikTokStyleCaptions } from "@remotion/captions";
import { AbsoluteFill, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { fuentes, tema } from "./marca";
import { Titular } from "./piezas/Titular";
import type { Guion, ReelProps, Tiempos } from "./tipos";

type Props = ReelProps & { guion?: Guion; tiempos?: Tiempos };

// Plantilla base: voz, rótulo de cada escena y subtítulos palabra a palabra.
// Es el suelo, no el techo: un reel con montaje propio vive en src/reels/<slug>.tsx y solo compone piezas.
// RELLENA: la zona segura de tu plataforma (márgenes donde no tapa la interfaz) y tu firma, si la quieres.
const ZONA_SEGURA = { arriba: 260, abajo: 420, lados: 120 };

export const Reel: React.FC<Props> = ({ guion, tiempos }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const t = tema(guion?.tema);
  if (!guion || !tiempos) return <AbsoluteFill style={{ background: t.fondo }} />;

  const ms = (frame / fps) * 1000;
  const { pages } = createTikTokStyleCaptions({ captions: tiempos.palabras, combineTokensWithinMilliseconds: 700 });
  // Si la escena en curso trae `subtitulo`, se enseña ese texto en vez de las palabras locutadas
  const enCurso = tiempos.escenas.findIndex((e) => ms >= e.startMs && ms < e.endMs);
  const subtituloFijo = enCurso >= 0 ? guion.escenas[enCurso]?.subtitulo : undefined;

  return (
    <AbsoluteFill style={{ background: t.fondo, fontFamily: fuentes.texto, color: t.texto }}>
      {tiempos.audio && <Audio src={staticFile(tiempos.audio)} />}

      {guion.escenas.map((e, i) => {
        const ti = tiempos.escenas[i];
        if (!e.pantalla || !ti) return null;
        const from = Math.round((ti.startMs / 1000) * fps);
        const dur = Math.max(1, Math.round(((ti.endMs - ti.startMs) / 1000) * fps));
        return (
          <Sequence key={i} from={from} durationInFrames={dur} name={`Escena ${i + 1}`}>
            <AbsoluteFill style={{ padding: `${ZONA_SEGURA.arriba}px ${ZONA_SEGURA.lados}px 0` }}>
              <Titular texto={e.pantalla} tema={guion.tema} tamano={56} alinear="left" />
            </AbsoluteFill>
          </Sequence>
        );
      })}

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: `0 ${ZONA_SEGURA.lados}px` }}>
        {subtituloFijo ? (
          <Subtitulo>{subtituloFijo}</Subtitulo>
        ) : (
          pages.map((p, i) => {
            if (ms < p.startMs || ms >= p.startMs + p.durationMs) return null;
            const local = frame - Math.round((p.startMs / 1000) * fps);
            return (
              <Subtitulo key={i} local={local}>
                {p.tokens.map((tk, j) => (
                  <span key={j} style={{ color: ms >= tk.fromMs && ms < tk.toMs ? t.acento : t.texto }}>{tk.text}</span>
                ))}
              </Subtitulo>
            );
          })
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Subtitulo: React.FC<{ local?: number; children: React.ReactNode }> = ({ local = 99, children }) => {
  const { fps } = useVideoConfig();
  const entrada = spring({ frame: local, fps, config: { damping: 200 }, durationInFrames: 8 });
  return (
    <div style={{ fontSize: 96, fontWeight: 700, lineHeight: 1.05, textAlign: "center", opacity: entrada, transform: `translateY(${interpolate(entrada, [0, 1], [24, 0])}px)` }}>
      {children}
    </div>
  );
};
