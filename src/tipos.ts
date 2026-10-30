import type { Caption } from "@remotion/captions";

// Lo que escribe el copywriter en public/reels/<slug>/guion.json
export type Escena = {
  voz: string; // lo que se dice, escrito como se pronuncia (lo que lee el proveedor de voz)
  subtitulo?: string; // lo que se lee en pantalla si difiere de `voz` (siglas, términos en otro idioma)
  pantalla?: string; // rótulo corto que acompaña a la escena (opcional)
  visual?: string; // indicación para el editor: qué se ve, qué pieza, qué recurso
  locutor?: string; // clave de guion.voces; sin locutor, la voz principal
  direccion?: string; // etiquetas de audio para el proveedor de voz; no salen en subtítulos
  pausa?: number; // ms de pausa tras la escena; scripts/ritmo.mjs la recorta o la alarga
  quitar?: string; // frase exacta que scripts/ritmo.mjs corta del audio sin regenerar
  inserto?: { texto: string; direccion?: string }; // frase suelta que se genera aparte (scripts/voz.mjs)
};

export type Voz = { id: string; nombre?: string; estabilidad?: number; tempo?: number; recortar?: boolean };

export type Ritmo = { tempo?: number; escenaMs?: number | null; fraseMs?: number | null; comaMs?: number | null; dentroMs?: number | null; cabezaMs?: number | null };

export type Guion = {
  slug: string;
  titulo: string; // título interno
  portada: string; // texto de la portada (el gancho)
  idioma?: string; // ISO 639-1, se manda al proveedor de voz
  modelo?: string; // modelo de voz para este reel, en vez del de .env
  estilo?: string; // id de tu biblioteca de estilos, si la tienes
  tema?: string; // id de tema de src/marca.ts
  voces?: Record<string, Voz>; // "principal" y las demás voces del reel
  ritmo?: Ritmo; // parámetros de scripts/ritmo.mjs
  escenas: Escena[];
  caption: string; // texto del post
  hashtags: string[];
};

// Lo que genera scripts/voz.mjs (tiempos.json) y scripts/ritmo.mjs (tiempos-ritmo.json)
export type EscenaTiempos = { startMs: number; endMs: number };
export type Tiempos = {
  audio: string | null; // ruta relativa a public/, null si es simulado
  duracionMs: number;
  simulado: boolean;
  palabras: Caption[];
  escenas: EscenaTiempos[];
};

export type ReelProps = { slug: string };
