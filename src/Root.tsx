import { Composition, Still, staticFile } from "remotion";
import { Portada } from "./Portada";
import { Reel } from "./Reel";
import { DURACION_PIEZAS_EJEMPLO, MuestraPiezasEjemplo } from "./piezas/MuestraPiezasEjemplo";
import type { Guion, ReelProps, Tiempos } from "./tipos";

const FPS = 30;
const ANCHO = 1080;
const ALTO = 1920;

// Lee el guion y los tiempos del reel. Si existe tiempos-ritmo.json (scripts/ritmo.mjs), manda sobre tiempos.json.
const leerReel = async (slug: string) => {
  const base = `reels/${slug}`;
  const guion = (await fetch(staticFile(`${base}/guion.json`)).then((r) => r.json())) as Guion;
  const conRitmo = await fetch(staticFile(`${base}/tiempos-ritmo.json`));
  const tiempos = (await (conRitmo.ok ? conRitmo : await fetch(staticFile(`${base}/tiempos.json`))).json()) as Tiempos;
  return { guion, tiempos };
};

export const RemotionRoot: React.FC = () => (
  <>
    {/* Plantilla base: npm run render -- <slug> la usa si el reel no tiene composición propia */}
    <Composition
      id="Reel"
      component={Reel}
      width={ANCHO}
      height={ALTO}
      fps={FPS}
      durationInFrames={FPS * 30}
      defaultProps={{ slug: "ejemplo" } satisfies ReelProps}
      calculateMetadata={async ({ props }) => {
        const { guion, tiempos } = await leerReel(props.slug);
        // medio segundo de aire al final para que la última palabra no se corte
        return { durationInFrames: Math.ceil(((tiempos.duracionMs + 600) / 1000) * FPS), props: { ...props, guion, tiempos } };
      }}
    />
    <Still
      id="Portada"
      component={Portada}
      width={ANCHO}
      height={ALTO}
      defaultProps={{ slug: "ejemplo" } satisfies ReelProps}
      calculateMetadata={async ({ props }) => ({
        props: { ...props, guion: (await fetch(staticFile(`reels/${props.slug}/guion.json`)).then((r) => r.json())) as Guion },
      })}
    />

    {/* Muestrarios de la biblioteca de piezas: uno por familia (docs/piezas.md) */}
    <Composition id="Piezas-ejemplo" component={MuestraPiezasEjemplo} width={ANCHO} height={ALTO} fps={FPS} durationInFrames={DURACION_PIEZAS_EJEMPLO} />

    {/* Reels con montaje propio: <Composition id="<slug>" component={...} /> desde src/reels/<slug>.tsx */}
  </>
);
