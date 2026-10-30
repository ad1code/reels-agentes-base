# reels-agentes-base

Un equipo de agentes de Claude Code que hace reels: guion, voz sintética, montaje con Remotion y publicación desde el navegador. Una persona decide en cada puerta; los agentes producen entre una puerta y la siguiente.

Esto es el esqueleto. No trae marca, ni voz, ni estilo, ni reglas aprendidas: los huecos van marcados con `RELLENA` y los rellenas tú.

## Para quién es
Para quien ya trabaja con Claude Code y no se pierde en una terminal. No es una app con botones: es un proyecto que montas en tu equipo, conectas a tus cuentas y vas afinando reel a reel.

Necesitas:
- Claude Code con una suscripción de Claude o una clave de API de Anthropic.
- Una cuenta de pago en un proveedor de voz (aquí, ElevenLabs).
- Tiempo para rellenar tu voz y tu marca. Sin eso, los agentes escriben y montan genérico.

## Cinco cosas que conviene tener claras
- **Subagente.** Un agente de Claude Code con su propio encargo, sus lecturas y sus permisos. Viven en `.claude/agents/` y solo se cargan si abres Claude Code en la raíz de este repo.
- **Remotion.** Una librería que hace vídeo con código (React). Cada reel es un componente; **Studio** es la vista previa en el navegador donde lo revisas antes de exportarlo.
- **Voz sintética.** El guion se convierte en audio con una voz de ElevenLabs, que además devuelve cuándo suena cada letra. De ahí salen los subtítulos sincronizados.
- **MCP de navegador.** Un MCP es un complemento que le da herramientas nuevas a Claude Code. Uno de navegador le deja abrir y manejar un Chrome: con él, el `publicador` sube el reel.
- **ffmpeg.** Programa de terminal para audio y vídeo. Los scripts lo usan para unir tomas, recortar silencios y cambiar el ritmo.

## El flujo y sus puertas

```
idea → direcciones → ◆ eliges → guion → ◆ apruebas el guion → voz → montaje
     → ◆ revisas en Studio → ◆ das permiso → render → ◆ OK antes de publicar
     → publicación → métricas → ◆ apruebas qué se aprende
```

Cada ◆ es una puerta humana. Ningún agente la salta: el guion no se locuta sin tu aprobación, el vídeo no se renderiza sin que lo hayas visto en Studio y nada se publica sin un OK explícito en el chat. Es lo que evita gastar créditos de voz en un guion flojo y publicar algo que no has visto.

Las puertas son instrucciones para los agentes, no un candado. Si quieres que Claude Code te pida confirmación antes de gastar o renderizar, añádelo en los permisos de `.claude/settings.json`.

El detalle, paso a paso, está en `AGENTS.md`.

## Qué hace cada agente

| Agente | Hace | No hace |
|---|---|---|
| `copywriter` | Direcciones, guion (`guion.md` y `guion.json`), texto del post y portada | Voz, montaje |
| `editor` | Plan de piezas, voz, ritmo, montaje en Remotion y, con permiso, render | Publicar, corregir el guion por su cuenta |
| `ilustrador` | Piezas dibujadas en código (personajes, iconos, pegatinas), por encargo del `editor` | Montar, renderizar |
| `publicador` | Sube el reel desde un navegador MCP y lee las métricas | Editar archivos, iniciar sesión, publicar sin OK |

## Por qué subagentes
- **Contexto limpio por tarea.** El `copywriter` no carga el código de Remotion y el `editor` no carga la guía de ganchos. Cada uno lee solo lo suyo y trabaja mejor.
- **La sesión principal es el director.** Reparte el trabajo, revisa lo que vuelve contra el repo y te lleva cada puerta. No produce: si algo falla, lo devuelve al agente con el motivo.
- **Permisos mínimos.** El `publicador` no puede escribir archivos; el `copywriter` no puede ejecutar comandos.

## Requisitos
- **Node** 22 o superior y **ffmpeg** (con `ffprobe`, que viene con él) accesibles desde la terminal. En Mac, ffmpeg se instala con Homebrew.
- **Remotion**, que se instala solo con `npm install`.
- **ElevenLabs.** `scripts/voz.mjs` está hecho para su API. Para otro proveedor hay que cambiar la función que lo llama.
- **Un MCP de navegador**, solo para publicar. Por ejemplo chrome-devtools MCP.
- **Claude Code**, abierto en la raíz de este repo.

## Conectar ElevenLabs
1. Crea una clave de API en tu cuenta de ElevenLabs. Dale solo permiso de Text to Speech y de lectura de voces: si algún día se filtra, no sirve para más.
2. Copia `.env.example` a `.env` y pega ahí la clave **tú, a mano**. No se la pases a tu agente por el chat: quedaría guardada en la conversación.
3. Si quieres una voz de la Voice Library, añádela antes a tus voces. `npm run voz -- voces` solo lista las de tu cuenta.
4. Copia el id de la voz que elijas en `ELEVENLABS_VOICE_ID`.

ElevenLabs cobra por carácter según tu plan. El script cuenta los caracteres antes de nada y no gasta sin `--si`.

## Conectar el navegador para publicar
- Configura el MCP de navegador solo en este proyecto y con un **perfil de Chrome propio**, que no sea el tuyo de siempre. Así el agente no ve tus pestañas ni tus sesiones.
- **La sesión en la red social la inicias tú**, a mano, en ese perfil. El agente nunca teclea contraseñas.
- Pon el nombre de tu MCP en `tools` de `.claude/agents/publicador.md`.

Las redes limitan el uso automatizado. Por eso el `publicador` va a ritmo de persona, un reel cada vez, y para antes de publicar. Usarlo de otra forma puede costarte la cuenta.

## Arrancar
```bash
npm install
cp .env.example .env              # y rellena la clave y la voz
npm run voz -- voces              # para elegir la voz
npm run voz -- ejemplo --simular  # tiempos estimados, sin gastar
npm run studio                    # composiciones Reel, Portada y Piezas-ejemplo
```

Después, en Claude Code: «quiero un reel sobre…» y la idea.

## Qué rellenar, y en qué orden
1. **Voz y marca.** `docs/voz.md` (cómo hablas, con textos tuyos reales) y `docs/marca.md` (colores, tipografías, assets). Copia los colores y las fuentes a `src/marca.ts`. Es lo que más pesa en el resultado.
2. **La guía.** `docs/guia-reels.md`: estructura, ganchos, retención, checklist. Mejor con fuentes y fechas.
3. **Las reglas.** Los `RELLENA` de `AGENTS.md` y de cada agente: lo que no se dice, de dónde salen los recursos, cuánto sonido.
4. **Las piezas.** Tu primera familia en `src/piezas/`, con su muestrario y sus filas en `docs/piezas.md`. `Titular` y `Piezas-ejemplo` enseñan el patrón.
5. **La publicación.** `docs/publicar.md`.

`docs/ERRORES.md` y `docs/aprendizajes.md` empiezan vacíos y crecen con el uso: ahí se queda lo que tu sistema aprende.

Para buscar lo que falta: `grep -rn RELLENA --exclude-dir=node_modules .`

## Estructura
| Ruta | Qué |
|---|---|
| `AGENTS.md` | Flujo, puertas, comandos y reglas. `CLAUDE.md` lo importa |
| `.claude/agents/` | Los cuatro agentes |
| `docs/` | Voz, marca, guía, catálogo de piezas, errores, aprendizajes y publicación |
| `scripts/voz.mjs` | Voz y tiempos. No gasta sin `--si` |
| `scripts/ritmo.mjs` | Ajusta silencios y tempo de la voz con ffmpeg |
| `scripts/render.mjs` | Render del vídeo y de la portada |
| `src/` | Plantilla `Reel`, `Portada`, tokens de marca y biblioteca de piezas |
| `public/reels/<slug>/` | Todo lo de cada reel. `ejemplo/` enseña la forma de un guion |

## Skills de terceros
Los agentes usan como método seis skills de copy de [social-media-skills/skills](https://github.com/social-media-skills/skills) (licencia MIT): `reels-script`, `hook-writer`, `short-form-video-script`, `caption-writer`, `brand-profile` y `voice-builder`. No vienen en este repo. Una skill son instrucciones que Claude Code carga cuando las necesita, así que léelas antes de instalarlas, como harías con cualquier código ajeno. Para instalarlas solo en el proyecto:

```bash
git clone https://github.com/social-media-skills/skills.git /tmp/social-media-skills
mkdir -p .claude/skills
for s in reels-script hook-writer short-form-video-script caption-writer brand-profile voice-builder; do
  cp -r /tmp/social-media-skills/skills/$s .claude/skills/
done
```

Si una de esas skills empuja a publicar o programar con un servicio externo, ignóralo: publicar es del `publicador`. Y si choca con `docs/voz.md`, gana `docs/voz.md`.

La skill oficial de Remotion ayuda al `editor` con captions, audio y timeline: `npx skills add remotion-dev/skills` (ver [la documentación de Remotion](https://www.remotion.dev/docs/ai/skills)).

## Licencia de Remotion
Remotion no es software libre al uso. Según su licencia (comprobada el 30-10-2026 en [remotion.dev/license](https://www.remotion.dev/license)), es gratis para particulares, para empresas con ánimo de lucro de hasta 3 empleados, para organizaciones sin ánimo de lucro y para evaluarlo. Por encima de eso hace falta una licencia de empresa. Compruébalo tú antes de usarlo para un negocio o un cliente: las condiciones pueden cambiar.

## Qué no viaja por Git
- `.env`: se rehace desde `.env.example`.
- `node_modules/`: `npm install`.
- `out/` (renders) y `media/` (material bruto).

## Licencia de este repo
MIT. Puedes usarla, copiarla y cambiarla, también para proyectos comerciales, siempre que conserves el aviso de `LICENSE`.

Hecha por [adicodev](https://adicodev.com).
