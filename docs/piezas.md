# Catálogo de piezas

Lo que cualquier agente lee antes de crear nada. Una fila por pieza de `src/piezas/`. La fila va en el mismo cambio que la pieza.

## Muestrarios en Studio (`npm run studio`, registrados en `src/Root.tsx`)

| Composición | Qué familia enseña |
|---|---|
| `Piezas-ejemplo` | `Titular` en dos temas y dos alineaciones. Páginas en los fotogramas 0 y 90 |

## Piezas

| Pieza | Archivo | Props | Sirve para | No sirve para | Reglas fijas | Reels |
|---|---|---|---|---|---|---|
| `Titular` | `src/piezas/Titular.tsx` | `texto`, `tema?`, `tamano?`, `desde?`, `alinear?` | Un titular que entra desde abajo | Subtítulos sincronizados con la voz (eso lo hace `Reel`) | — | ejemplo |

## Cómo se añade una fila
- **Pieza:** el nombre del componente (o de la familia, si son varios en un archivo).
- **Archivo:** la ruta.
- **Props:** las que cambian entre reels; `?` si son opcionales.
- **Sirve para / No sirve para:** una frase cada una. Lo segundo evita que se use donde no encaja.
- **Reglas fijas:** lo que el humano ya decidió y no se cambia sin que lo pida.
- **Reels:** los slugs donde sale. Se amplía al cerrar cada reel.
