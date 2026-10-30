#!/usr/bin/env node
// Ritmo de la locución, sin gastar créditos: acorta los silencios largos y acelera manteniendo el tono.
//   npm run ritmo -- <slug> [--tempo 1.1] [--escena ms] [--frase ms] [--coma ms] [--dentro ms] [--cabeza ms]
// Todos los valores son parámetros. Orden de prioridad: la bandera, luego guion.ritmo, luego el valor neutro.
//   guion.ritmo = { "tempo": 1, "escenaMs": null, "fraseMs": null, "comaMs": null, "dentroMs": null, "cabezaMs": null }
// Valor neutro: tempo 1 y ningún silencio recortado. El script no trae un ritmo de fábrica: el tuyo lo decides tú
// probando con tu voz y lo apuntas en guion.ritmo o en docs/aprendizajes.md cuando lo tengas.
// Cada silencio se recorta según lo que lo precede (ms que se dejan, del audio original): fin de escena, fin de frase
// (. ? ! :), coma (, ;) o a mitad de frase.
// --cabeza: silencio que queda antes de la primera palabra (ms); si la toma trae menos, se añade. Sin valor, no se toca.
// escena.pausa (ms, antes del tempo) fija la pausa tras esa escena; si la toma trae menos silencio, se añade.
// Por locutor, guion.voces.<locutor> admite tempo (sustituye al general) y recortar: false (no toca sus pausas internas).
// escena.quitar = "frase exacta": se corta del audio sin regenerar nada.
// insertos.json (de voz.mjs, escena.inserto): cada frase suelta entra en la pausa de detrás de su escena, a su tempo.
// Lee voz.mp3 y tiempos.json. Escribe voz-ritmo.mp3 y tiempos-ritmo.json (mismo formato que tiempos.json).
// Los cortes van solo dentro de silencios reales (silencedetect con umbral adaptativo),
// nunca por los tiempos de palabra del proveedor, que pueden comerse finales de sílaba.
// La velocidad se aplica con atempo de ffmpeg, que conserva el tono. Requiere ffmpeg en el PATH.
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const args = process.argv.slice(2)
const slug = args[0] || (console.error('Uso: npm run ritmo -- <slug> [--tempo 1.1] [--escena ms] [--frase ms] [--coma ms] [--dentro ms] [--cabeza ms]'), process.exit(1))
const opt = (k, d) => { const i = args.indexOf(k); return i > 0 ? Number(args[i + 1]) : d }
const PRINCIPAL = 'principal'
const dir = join('public/reels', slug)
const voz = join(dir, 'voz.mp3')
if (!existsSync(voz)) { console.error(`No existe ${voz}. Primero: npm run voz -- ${slug} --si`); process.exit(1) }
const guion = JSON.parse(readFileSync(join(dir, 'guion.json'), 'utf8'))
const R = guion.ritmo || {}
const tempo = opt('--tempo', R.tempo ?? 1)
// null o ausente = no se recorta ese tipo de silencio
const DEJA = {
  escena: opt('--escena', R.escenaMs ?? Infinity),
  frase: opt('--frase', R.fraseMs ?? Infinity),
  coma: opt('--coma', R.comaMs ?? Infinity),
  dentro: opt('--dentro', R.dentroMs ?? Infinity),
}
const cabezaMs = opt('--cabeza', R.cabezaMs ?? null)
const CABEZA = cabezaMs == null ? null : cabezaMs / 1000
const t = JSON.parse(readFileSync(join(dir, 'tiempos.json'), 'utf8'))
// Última palabra de cada escena → índice de escena, para saber si un silencio cae entre escenas
const finEscena = new Map()
t.escenas.forEach((e, k) => {
  let ult = -1
  t.palabras.forEach((p, i) => { if (p.endMs <= e.endMs + 20) ult = i })
  if (ult >= 0) finEscena.set(ult, k)
})
// Cuánto silencio se deja (s) según la palabra que va justo antes. Se busca por inicio, no por final:
// ElevenLabs estira el final de la última palabra (y su puntuación) hasta dentro del silencio
const cuanto = (s) => {
  let i = -1
  t.palabras.forEach((p, j) => { if (p.startMs / 1000 < s) i = j })
  if (i < 0) return { tipo: 'dentro', deja: DEJA.dentro / 1000 }
  if (finEscena.has(i)) return { tipo: 'escena', deja: (guion.escenas[finEscena.get(i)]?.pausa ?? DEJA.escena) / 1000 }
  const ultimo = t.palabras[i].text.trim().slice(-1)
  const tipo = /[.!?…:»]/.test(ultimo) ? 'frase' : /[,;]/.test(ultimo) ? 'coma' : 'dentro'
  return { tipo, deja: DEJA[tipo] / 1000 }
}

// Escena en la que cae un instante (la última que ha empezado) y ajustes de su locutor
const escenaEn = (sec) => { let k = 0; t.escenas.forEach((e, j) => { if (e.startMs / 1000 <= sec) k = j }); return k }
const ajuste = (k) => {
  const v = guion.voces?.[guion.escenas[k]?.locutor || PRINCIPAL] || {}
  return { tempo: v.tempo ?? tempo, recortar: v.recortar ?? true }
}

// ffmpeg escribe los informes de los filtros por stderr
const log = (a) => spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...a], { encoding: 'utf8' }).stderr

// 1. Umbral adaptativo con loudnorm, 2. silencios reales
const ln = log(['-i', voz, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'])
const umbral = Number(JSON.parse(ln.slice(ln.lastIndexOf('{'), ln.lastIndexOf('}') + 1)).input_thresh)
const sd = log(['-i', voz, '-af', `silencedetect=noise=${umbral}dB:d=0.12`, '-f', 'null', '-'])
const silencios = []
for (const m of sd.matchAll(/silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g)) silencios.push([Number(m[1]), Number(m[2])])
const dur = Number(/Duration: (\d+):(\d+):([\d.]+)/.exec(sd).slice(1).reduce((a, x) => a * 60 + Number(x), 0))
// Arranque real de la voz (umbral bajo, para no comerse el ataque de la primera sílaba) y silencio de cabeza:
// se deja CABEZA antes de la primera palabra; si la toma trae menos, se rellena con silencio delante
const sdCab = log(['-i', voz, '-t', '3', '-af', 'silencedetect=noise=-50dB:d=0.01', '-f', 'null', '-'])
const m0 = /silence_start: (-?[\d.]+)[\s\S]*?silence_end: ([\d.]+)/.exec(sdCab)
const arranque = m0 && Number(m0[1]) < 0.01 ? Number(m0[2]) : 0
const relleno = CABEZA == null ? 0 : Math.max(0, CABEZA - arranque)

// 3. Tramos que se quedan: de cada silencio se deja lo que pide su contexto (más cola que entrada, para no cortar la caída de la voz)
const tramos = []; let desde = CABEZA == null ? 0 : Math.max(0, arranque - CABEZA); const tipos = {}
for (const [s, e] of silencios) {
  const inicio = s < 0.05, final = e > dur - 0.05
  if (inicio) continue // la cabeza la fija CABEZA (o se deja como viene)
  const c = cuanto(s)
  const deja = final && Number.isFinite(c.deja) ? Math.min(0.25, c.deja) : c.deja
  if (!inicio && !final && c.tipo !== 'escena' && !ajuste(escenaEn(s)).recortar) continue
  if (!inicio && !final && e - s > deja) tipos[c.tipo] = (tipos[c.tipo] || 0) + 1
  if (e - s <= deja) continue
  const corteA = s + deja * 0.6
  const corteB = final ? dur : e - deja * 0.4
  if (corteA > desde) tramos.push([desde, corteA])
  desde = corteB
}
if (desde < dur) tramos.push([desde, dur])
// Donde cambia el tempo entre escenas seguidas, se parte el tramo a mitad del hueco; cada tramo lleva su tempo
for (let k = 0; k + 1 < t.escenas.length; k++) {
  if (ajuste(k).tempo === ajuste(k + 1).tempo) continue
  const b = (t.escenas[k].endMs + t.escenas[k + 1].startMs) / 2000
  const i = tramos.findIndex(([x, y]) => x < b && b < y)
  if (i >= 0) tramos.splice(i, 1, [tramos[i][0], b], [b, tramos[i][1]])
}
for (const tr of tramos) tr[2] = ajuste(escenaEn((tr[0] + tr[1]) / 2)).tempo
// Pausas que piden más silencio del que trae la toma: se parte el tramo en el punto de la pausa y se le añade relleno
guion.escenas.forEach((e, k) => {
  if (e.pausa == null || k + 1 >= t.escenas.length) return
  const fin = t.escenas[k].endMs / 1000, sig = t.escenas[k + 1].startMs / 1000
  const sil = silencios.find(([a, b]) => a < sig + 0.3 && b > fin - 0.3)
  const dejado = sil ? Math.min(sil[1] - sil[0], e.pausa / 1000) : 0
  const falta = e.pausa / 1000 - dejado
  if (falta < 0.02) return
  const p = sil ? sil[0] + dejado * 0.6 : (fin + sig) / 2
  const i = tramos.findIndex(([x, y]) => x < p && p <= y)
  if (i < 0) return
  if (p < tramos[i][1] - 0.001) tramos.splice(i, 1, [tramos[i][0], p, tramos[i][2]], [p, tramos[i][1], tramos[i][2]])
  tramos[i][3] = [{ d: falta / tramos[i][2] }]
})

// Frases quitadas (escena.quitar): se busca la frase palabra a palabra dentro de su escena y se corta
const limpia = (x) => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9ñ]/g, '')
const quitadas = new Set()
const corteEscena = {} // escena → punto donde empieza su corte (si se quita su final, ahí entra su inserto)
guion.escenas.forEach((e, k) => {
  if (!e.quitar) return
  const objetivo = e.quitar.split(/\s+/).map(limpia).filter(Boolean)
  const tope = t.escenas[k + 1]?.startMs ?? Infinity
  const idx = t.palabras.map((_, i) => i).filter((i) => t.palabras[i].startMs >= t.escenas[k].startMs - 1 && t.palabras[i].startMs < tope)
  const s0 = idx.findIndex((_, j) => j + objetivo.length <= idx.length && objetivo.every((w, m) => limpia(t.palabras[idx[j + m]].text) === w))
  if (s0 < 0) { console.warn(`Aviso: no encuentro «${e.quitar}» en la escena ${k + 1}; no se quita.`); return }
  const prim = idx[s0], ult = idx[s0 + objetivo.length - 1]
  for (let j = prim; j <= ult; j++) quitadas.add(j)
  corteEscena[k] = t.palabras[prim].startMs / 1000 - 0.03
  const qa = t.palabras[prim].startMs / 1000 - 0.03
  const qb = (t.palabras[ult + 1]?.startMs ?? dur * 1000) / 1000 - 0.06
  const nuevos = []
  for (const tr of tramos) {
    const [a, b, tp, ex] = tr
    if (b <= qa || a >= qb) { nuevos.push(tr); continue }
    if (a < qa) nuevos.push([a, qa, tp, b <= qb ? ex : undefined])
    if (b > qb) nuevos.push([qb, b, tp, ex])
  }
  tramos.splice(0, tramos.length, ...nuevos)
  console.log(`Quitado de la escena ${k + 1}: «${e.quitar}» (${(qb - qa).toFixed(2)} s)`)
})

// Insertos: van en la pausa de detrás de su escena (mismo punto que escena.pausa): 0,3 s, la frase y al menos 0,5 s
const insertos = existsSync(join(dir, 'insertos.json')) ? JSON.parse(readFileSync(join(dir, 'insertos.json'), 'utf8')) : []
for (const ins of insertos) {
  const k = ins.escena
  if (k + 1 >= t.escenas.length) continue
  const fin = t.escenas[k].endMs / 1000, sig = t.escenas[k + 1].startMs / 1000
  const sil = silencios.find(([a, b]) => a < sig + 0.3 && b > fin - 0.3)
  const pausa = (guion.escenas[k].pausa ?? DEJA.escena) / 1000
  const dejado = sil ? Math.min(sil[1] - sil[0], pausa) : 0
  const p = corteEscena[k] ?? (sil ? sil[0] + dejado * 0.6 : (fin + sig) / 2)
  let i = tramos.findIndex(([x, y]) => x < p && p <= y + 0.001)
  if (i < 0) continue
  if (p < tramos[i][1] - 0.001) tramos.splice(i, 1, [tramos[i][0], p, tramos[i][2]], [p, tramos[i][1], tramos[i][2], tramos[i][3]])
  const tpi = ajuste(k).tempo
  const antes = (tramos[i][3] || []).reduce((n, x) => n + x.d, 0)
  const clip = ins.durS / tpi
  const pre = corteEscena[k] !== undefined ? 0.05 : 0.3 // tras un corte ya queda la pausa de la frase anterior
  tramos[i][3] = [{ d: pre }, { d: clip, mp3: ins.mp3, tp: tpi, palabras: ins.palabras }, { d: Math.max(0.5, antes - pre - clip) }]
  console.log(`Inserto tras la escena ${k + 1}: «${ins.texto}» (${clip.toFixed(2)} s)`)
}

// 4. Audio nuevo: tramos con fundidos de 8 ms (los cortes caen en silencio) y el atempo de cada uno
const fade = 0.008
const fmt = 'aformat=sample_rates=44100:channel_layouts=mono'
const clips = tramos.flatMap((tr) => (tr[3] || []).filter((x) => x.mp3))
const partes = tramos.map(([a, b, tp, ex], i) => `[0:a]atrim=${a.toFixed(4)}:${b.toFixed(4)},asetpts=PTS-STARTPTS,afade=t=in:d=${fade},afade=t=out:st=${(b - a - fade).toFixed(4)}:d=${fade}${tp !== 1 ? `,atempo=${tp}` : ''},${fmt}[p${i}]`
  + (ex || []).map((x, j) => x.mp3
    ? `;[${clips.indexOf(x) + 1}:a]${x.tp !== 1 ? `atempo=${x.tp},` : ''}${fmt}[x${i}_${j}]`
    : `;aevalsrc=0:d=${x.d.toFixed(4)}:s=44100,${fmt}[x${i}_${j}]`).join(''))
const cabeza = relleno > 0.001 ? `aevalsrc=0:d=${relleno.toFixed(4)}:s=44100,${fmt}[cab];` : ''
const entradas = (cabeza ? '[cab]' : '') + tramos.map((tr, i) => `[p${i}]` + (tr[3] || []).map((_, j) => `[x${i}_${j}]`).join('')).join('')
const filtro = `${cabeza}${partes.join(';')};${entradas}concat=n=${(cabeza ? 1 : 0) + tramos.reduce((n, tr) => n + 1 + (tr[3] || []).length, 0)}:v=0:a=1[out]`
const salida = join(dir, 'voz-ritmo.mp3')
const r = spawnSync('ffmpeg', ['-hide_banner', '-y', '-i', voz, ...clips.flatMap((x) => ['-i', x.mp3]), '-filter_complex', filtro, '-map', '[out]', '-b:a', '192k', salida], { encoding: 'utf8' })
if (r.status !== 0) { console.error(r.stderr.slice(-2000)); process.exit(1) }

// 5. Tiempos: original → nuevo (lo que cae en un hueco quitado va al inicio del tramo siguiente)
const mover = (ms) => {
  const s = ms / 1000; let acum = relleno
  for (const [a, b, tp, ex] of tramos) {
    if (s < a) return Math.round(acum * 1000)
    if (s < b) return Math.round((acum + (s - a) / tp) * 1000)
    acum += (b - a) / tp + (ex || []).reduce((n, x) => n + x.d, 0)
  }
  return Math.round(acum * 1000)
}
// Palabras de los insertos, en tiempo de salida
const palabrasInsertos = []
{
  let acum = relleno
  for (const [a, b, tp, ex] of tramos) {
    acum += (b - a) / tp
    for (const x of ex || []) {
      if (x.palabras) for (const w of x.palabras) palabrasInsertos.push({ text: w.text, startMs: Math.round((acum + w.startMs / 1000 / x.tp) * 1000), endMs: Math.round((acum + w.endMs / 1000 / x.tp) * 1000), timestampMs: null, confidence: null })
      acum += x.d
    }
  }
  for (const w of palabrasInsertos) w.timestampMs = Math.round((w.startMs + w.endMs) / 2)
}
const quitado = tramos.reduce((a, [x, y]) => a - (y - x), dur)
const porLocutor = Object.fromEntries(Object.keys(guion.voces || {}).map((l) => [l, ajuste(guion.escenas.findIndex((e) => (e.locutor || PRINCIPAL) === l))]))
const nuevo = {
  audio: `reels/${slug}/voz-ritmo.mp3`,
  duracionMs: mover(dur * 1000),
  simulado: false,
  palabras: [
    ...t.palabras.filter((_, i) => !quitadas.has(i)).map((p) => ({ ...p, startMs: mover(p.startMs), endMs: mover(p.endMs), timestampMs: p.timestampMs === null ? null : mover(p.timestampMs) })),
    ...palabrasInsertos,
  ].sort((x, y) => x.startMs - y.startMs),
  escenas: t.escenas.map((e) => ({ startMs: mover(e.startMs), endMs: mover(e.endMs) })),
  ritmo: { tempo, porLocutor, dejaMs: Object.fromEntries(Object.entries(DEJA).map(([k, v]) => [k, Number.isFinite(v) ? v : null])), cabezaMs: CABEZA == null ? null : Math.round(CABEZA * 1000), rellenoCabezaMs: Math.round(relleno * 1000), umbralDb: umbral, cortes: tramos.length - 1 },
}
// Ninguna palabra acaba después de que empiece la siguiente (ElevenLabs alarga la última de cada frase dentro de la pausa,
// y si en esa pausa entra un inserto, los subtítulos se pisarían)
nuevo.palabras.forEach((w, i) => {
  const sig = nuevo.palabras[i + 1]
  if (sig && w.endMs > sig.startMs - 10) w.endMs = Math.max(w.startMs + 1, sig.startMs - 10)
  w.timestampMs = Math.round((w.startMs + w.endMs) / 2)
})
writeFileSync(join(dir, 'tiempos-ritmo.json'), JSON.stringify(nuevo, null, 1))
console.log(`${silencios.length} silencios · ${tramos.length - 1} cortes (${Object.entries(tipos).map(([k, n]) => `${n} ${k}`).join(', ')}) · ${quitado.toFixed(1)} s de silencio fuera · tempo ${tempo} → ${(nuevo.duracionMs / 1000).toFixed(1)} s (${salida})`)
