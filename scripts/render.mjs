#!/usr/bin/env node
// Render del reel y de su portada.   npm run render -- <slug> [composición]
// Solo con permiso explícito del humano, después de que haya revisado el montaje en Studio (AGENTS.md).
// Composición: la que se pida; si no, la propia del reel (src/reels/<slug>.tsx, id = slug); si no, la plantilla Reel.
// Salida: out/AAAA-MM-DD_reel_<slug>.mp4 y out/AAAA-MM-DD_reel_<slug>_portada.jpg
// La calidad sale de remotion.config.ts, igual que el botón de render de Studio.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'

const slug = process.argv[2] || (console.error('Uso: npm run render -- <slug> [composición]'), process.exit(1))
const comp = process.argv[3] || (existsSync(`src/reels/${slug}.tsx`) ? slug : 'Reel')
const props = JSON.stringify({ slug })
// Puerto propio para no chocar con un Studio abierto. RELLENA: cámbialo si lo tienes ocupado.
const PUERTO = process.env.RENDER_PORT || '3311'
const run = (a) => execFileSync('npx', ['remotion', ...a, `--port=${PUERTO}`], { stdio: 'inherit' })

mkdirSync('out', { recursive: true })
const fecha = new Date().toLocaleDateString('sv-SE')
const base = `out/${fecha}_reel_${process.argv[3] || slug}`
run(['render', comp, `${base}.mp4`, `--props=${props}`])
run(['still', 'Portada', `${base}_portada.jpg`, `--props=${props}`])
console.log(`Listo: ${base}.mp4 y ${base}_portada.jpg`)
