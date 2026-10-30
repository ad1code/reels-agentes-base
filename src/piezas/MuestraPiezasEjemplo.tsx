import { AbsoluteFill, Sequence } from "remotion";
import { fuentes, tema } from "../marca";
import { Titular } from "./Titular";

// Muestrario de la familia «ejemplo» (composición Piezas-ejemplo en Studio). No se publica.
// Cada familia de piezas tiene el suyo: si una pieza no sale en un muestrario, no existe para el siguiente agente.
// Páginas de PAGINA fotogramas; cada una enseña la pieza en un estado o con unas props distintas.
export const PAGINA = 90;
export const DURACION_PIEZAS_EJEMPLO = PAGINA * 2;

const Etiqueta: React.FC<{ children: string; temaId?: string }> = ({ children, temaId }) => (
  <div style={{ position: "absolute", top: 260, left: 120, right: 120, fontFamily: fuentes.mono, fontSize: 26, color: tema(temaId).apagado }}>
    {children}
  </div>
);

export const MuestraPiezasEjemplo: React.FC = () => (
  <AbsoluteFill>
    <Sequence durationInFrames={PAGINA} name="Titular · base">
      <AbsoluteFill style={{ background: tema("base").fondo, justifyContent: "center", padding: "0 120px" }}>
        <Etiqueta>Titular · tema base · centrado</Etiqueta>
        <Titular texto="Un titular de ejemplo" />
      </AbsoluteFill>
    </Sequence>
    <Sequence from={PAGINA} durationInFrames={PAGINA} name="Titular · claro">
      <AbsoluteFill style={{ background: tema("claro").fondo, justifyContent: "center", padding: "0 120px" }}>
        <Etiqueta temaId="claro">Titular · tema claro · izquierda · desde 15</Etiqueta>
        <Titular texto="Otro titular, alineado a la izquierda" tema="claro" tamano={80} alinear="left" desde={15} />
      </AbsoluteFill>
    </Sequence>
  </AbsoluteFill>
);
