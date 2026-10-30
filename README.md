# reels-agentes-base

Un equipo de agentes de Claude Code que hace reels: guion, voz sintética, montaje con Remotion y publicación desde el navegador. Una persona decide en cada puerta; los agentes producen entre una puerta y la siguiente.

Esto es el esqueleto. No trae marca, ni voz, ni estilo, ni reglas aprendidas: los huecos van marcados con `RELLENA` y los rellenas tú.

## El flujo y sus puertas

```
idea → direcciones → ◆ eliges → guion → ◆ apruebas el guion → voz → montaje
     → ◆ revisas en Studio → ◆ das permiso → render → ◆ OK antes de publicar
     → publicación → métricas → ◆ apruebas qué se aprende
```

Cada ◆ es una puerta humana. Ningún agente la salta: el guion no se locuta sin tu aprobación, el vídeo no se renderiza sin que lo hayas visto en Studio y nada se publica sin un OK explícito en el chat. Es lo que evita gastar créditos de voz en un guion flojo y publicar algo que no has visto.

El detalle, paso a paso, está en `AGENTS.md`.

## Qué hace cada agente

| Agente | Hace | No hace |
|---|---|---|
| `copywriter` | Direcciones, guion (`guion.md` y `guion.json`), texto del post y portada | Voz, montaje |
| `editor` | Plan de piezas, voz, ritmo, montaje en Remotion y, con permiso, render | Publicar, corregir el guion por su cuenta |
| `ilustrador` | Piezas dibujadas en código (personajes, iconos, pegatinas), por encargo del `editor` | Montar, renderizar |
| `publicador` | Sube el reel desde un navegador MCP y lee las métricas | Editar archivos, iniciar sesión, publicar sin OK |

Están en `.claude/agents/`.

## Por qué subagentes
- **Contexto limpio por tarea.** El `copywriter` no carga el código de Remotion y el `editor` no carga la guía de ganchos. Cada uno lee solo lo suyo y trabaja mejor.
- **La sesión principal es el director.** Reparte el trabajo, revisa lo que vuelve contra el repo y te lleva cada puerta. No produce: si algo falla, lo devuelve al agente con el motivo.
- **Permisos mínimos.** El `publicador` no puede escribir archivos; el `copywriter` no puede ejecutar comandos.

## Qué rellenar, y en qué orden
1. **Voz y marca.** `docs/voz.md` (cómo hablas, con ejemplos reales) y `docs/marca.md` (colores, tipografías, assets). Copia los colores y las fuentes a `src/marca.ts`. Sin esto, el `copywriter` escribe genérico.
2. **La guía.** `docs/guia-reels.md`: estructura, ganchos, retención, checklist. Mejor con fuentes y fechas.
3. **Las reglas.** Los `RELLENA` de `AGENTS.md` y de cada agente: lo que no se dice, de dónde salen los recursos, cuánto sonido.
4. **Las piezas.** Tu primera familia en `src/piezas/`, con su muestrario y sus filas en `docs/piezas.md`. `Titular` y `Piezas-ejemplo` enseñan el patrón.
5. **La publicación.** `docs/publicar.md` y el nombre de tu MCP de navegador en `tools` de `.claude/agents/publicador.md`.

`docs/ERRORES.md` y `docs/aprendizajes.md` empiezan vacíos y crecen con el uso.

Para buscar lo que falta: `grep -rn RELLENA --exclude-dir=node_modules .`

## Requisitos
- **Node** 22 o superior (los scripts usan `--env-file-if-exists`) y **ffmpeg** con `ffprobe` en el PATH.
- **Remotion**, que se instala con `npm install`.
- **Un proveedor de voz.** `scripts/voz.mjs` usa ElevenLabs. Para otro proveedor, cambia la función que llama a la API: el resto del flujo solo necesita `voz.mp3` y los tiempos por carácter o por palabra.
- **Un MCP de navegador** para publicar, por ejemplo chrome-devtools MCP, configurado solo para este proyecto y con un perfil propio.
- **Claude Code**, abierto en la raíz de este repo para que carguen los agentes.

## Arrancar
```bash
npm install
cp .env.example .env              # y rellena la clave y la voz
npm run voz -- voces              # para elegir la voz
npm run voz -- ejemplo --simular  # tiempos estimados, sin gastar
npm run studio                    # composiciones Reel, Portada y Piezas-ejemplo
```

Después, en Claude Code: «quiero un reel sobre…» y la idea.

## Estructura
| Ruta | Qué |
|---|---|
| `AGENTS.md` | Flujo, puertas, comandos y reglas. `CLAUDE.md` lo importa |
| `.claude/agents/` | Los cuatro agentes |
| `docs/` | Voz, marca, guía, catálogo de piezas, errores, aprendizajes y publicación |
| `scripts/voz.mjs` | Voz y tiempos. No gasta sin `--si` |
| `scripts/ritmo.mjs` | Recorta silencios y ajusta el tempo con ffmpeg. Todo por parámetros |
| `scripts/render.mjs` | Render del vídeo y de la portada |
| `src/` | Plantilla `Reel`, `Portada`, tokens de marca y biblioteca de piezas |
| `public/reels/<slug>/` | Todo lo de cada reel. `ejemplo/` enseña la forma de un guion |

## Skills de terceros
Los agentes usan como método seis skills de copy de [social-media-skills/skills](https://github.com/social-media-skills/skills) (licencia MIT): `reels-script`, `hook-writer`, `short-form-video-script`, `caption-writer`, `brand-profile` y `voice-builder`. No vienen en este repo. Para instalarlas solo en el proyecto:

```bash
git clone https://github.com/social-media-skills/skills.git /tmp/social-media-skills
mkdir -p .claude/skills
for s in reels-script hook-writer short-form-video-script caption-writer brand-profile voice-builder; do
  cp -r /tmp/social-media-skills/skills/$s .claude/skills/
done
```

Su README trae también la instalación global con `npx skills add`. Si una de esas skills empuja a publicar o programar con un servicio externo, ignóralo: publicar es del `publicador`. Y si choca con `docs/voz.md`, gana `docs/voz.md`.

La skill oficial de Remotion ayuda al `editor` con captions, audio y timeline: `npx skills add remotion-dev/skills` (ver [la documentación de Remotion](https://www.remotion.dev/docs/ai/skills)).

## Licencia de Remotion
Remotion no es software libre al uso. Según su licencia (comprobada el 30-10-2026 en [remotion.dev/license](https://www.remotion.dev/license)), es gratis para particulares, para empresas con ánimo de lucro de hasta 3 empleados, para organizaciones sin ánimo de lucro y para evaluarlo. Por encima de eso hace falta una licencia de empresa. Compruébalo tú antes de usarlo para un negocio o un cliente: las condiciones pueden cambiar.

## Qué no viaja por Git
- `.env`: se rehace desde `.env.example`.
- `node_modules/`: `npm install`.
- `out/` (renders) y `media/` (material bruto).

## Licencia de este repo
MIT. Puedes usarla, copiarla y cambiarla, también para proyectos comerciales, siempre que conserves el aviso de `LICENSE`.

Hecha por [adicode](https://adicodev.com).
