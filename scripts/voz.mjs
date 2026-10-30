#!/usr/bin/env node
// Voz y tiempos de un reel con ElevenLabs.
//   npm run voz -- voces                  lista tus voces (id y nombre)
//   npm run voz -- <slug>                 cuenta caracteres y para: no gasta créditos
//   npm run voz -- <slug> --si            genera la voz (endpoint with-timestamps). Solo así se gasta.
//   npm run voz -- <slug> --simular       tiempos estimados sin audio, para previsualizar gratis
//   npm run voz -- <slug> --si --rehacer  ignora los tramos guardados y lo genera todo de nuevo
// Lee public/reels/<slug>/guion.json. Escribe voz.mp3, alineacion.json (crudo) y tiempos.json.
//
// De dónde sale la voz:
//   - Voz principal: guion.voces.principal.id si existe; si no, ELEVENLABS_VOICE_ID de .env.
//   - Otras voces: guion.voces = { narrador: { id, estabilidad } } y escena.locutor = "narrador".
//     Sin locutor, la escena va con la voz principal.
// Modelo: guion.modelo o ELEVENLABS_MODEL; si no hay ninguno, eleven_multilingual_v2.
// guion.idioma = "es" (opcional): se manda como language_code para que el modelo no deduzca el idioma.
// escena.direccion = "[calm]": etiquetas de audio para modelos que las admiten. Se envían, pero no salen en los subtítulos.
// Cada tramo seguido de un mismo locutor es una llamada; los tramos se unen con ffmpeg y una pausa de PAUSA s.
// Cada tramo generado se guarda en public/reels/<slug>/tramos/; si no cambia (texto, voz, ajustes), se reutiliza sin gastar.
// escena.inserto = { texto, direccion? }: frase suelta que se genera aparte y que ritmo.mjs mete en la pausa
// de detrás de esa escena. Sirve para añadir una frase sin regenerar los tramos ya aprobados. Se anota en insertos.json.
// Requiere ffmpeg y ffprobe en el PATH.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'

const [cmd, ...rest] = process.argv.slice(2)
const API = 'https://api.elevenlabs.io/v1'
const KEY = process.env.ELEVENLABS_API_KEY
const die = (m) => { console.error(m); process.exit(1) }
const needKey = () => KEY || die('Falta ELEVENLABS_API_KEY en .env (copia .env.example).')

if (!cmd) die('Uso: npm run voz -- voces | <slug> [--si | --simular]')

if (cmd === 'voces') {
  needKey()
  const r = await fetch(`${API}/voices`, { headers: { 'xi-api-key': KEY } })
  if (!r.ok) die(`ElevenLabs ${r.status}: ${await r.text()}`)
  for (const v of (await r.json()).voices) {
    const l = v.labels || {}
    console.log(`${v.voice_id}  ${v.name}  ${[l.language, l.accent, l.gender, l.age].filter(Boolean).join(' · ')}`)
  }
  process.exit(0)
}

const dir = join('public/reels', cmd)
const gpath = join(dir, 'guion.json')
if (!existsSync(gpath)) die(`No existe ${gpath}. Lo escribe el copywriter.`)
const guion = JSON.parse(readFileSync(gpath, 'utf8'))

// El texto que se locuta: escenas unidas por un espacio. Guardamos dónde empieza y acaba cada una.
let texto = ''; const rangos = []
for (const e of guion.escenas) {
  if (texto) texto += ' '
  const a = texto.length; texto += e.voz.trim(); rangos.push([a, texto.length])
}

// Tramos: escenas seguidas con el mismo locutor. envio es lo que se manda (con direcciones);
// mapa[k] dice qué carácter de texto es envio[k], o -1 si es de una dirección.
const PAUSA = 0.45
const PRINCIPAL = 'principal'
const tramos = []
guion.escenas.forEach((e, i) => {
  const loc = e.locutor || PRINCIPAL
  let t = tramos.at(-1)
  if (!t || t.loc !== loc) tramos.push(t = { loc, envio: '', mapa: [] })
  const pon = (s, desde) => { for (let k = 0; k < s.length; k++) { t.envio += s[k]; t.mapa.push(desde < 0 ? -1 : desde + k) } }
  if (i > 0) { if (t.envio) pon(' ', rangos[i][0] - 1); }
  if (e.direccion) pon(e.direccion.trim() + ' ', -1)
  pon(e.voz.trim(), rangos[i][0])
})
// guion.modelo (opcional) sustituye a ELEVENLABS_MODEL para ese reel. Entra en la clave de la caché como cualquier modelo.
const model = guion.modelo || process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2'
const SIN_IDIOMA = ['eleven_multilingual_v2'] // según la documentación de ElevenLabs, estos modelos no admiten language_code. Compruébalo.
const voz = (loc) => {
  if (loc === PRINCIPAL) {
    // Contar y simular no necesitan voz: solo --si exige una id real
    const id = guion.voces?.[PRINCIPAL]?.id || process.env.ELEVENLABS_VOICE_ID || (!rest.includes('--si') && 'sin-voz') || die('Falta la voz principal: guion.voces.principal.id o ELEVENLABS_VOICE_ID en .env. Búscala con: npm run voz -- voces')
    return { id, estabilidad: guion.voces?.[PRINCIPAL]?.estabilidad ?? Number(process.env.ELEVENLABS_STABILITY || 0.5) }
  }
  const v = guion.voces?.[loc] || die(`La escena pide el locutor «${loc}», pero no está en guion.voces.`)
  return { id: v.id, estabilidad: v.estabilidad ?? 0.5 }
}
const cache = join(dir, 'tramos')
// guion.idioma = "es" (opcional): se manda como language_code (ISO 639-1). Sin idioma, el modelo lo deduce.
const idioma = (guion.idioma && !SIN_IDIOMA.includes(model)) ? guion.idioma : null
if (guion.idioma && !idioma) console.log(`«idioma» no se manda: ${model} no admite language_code`)
if (model === 'eleven_multilingual_v2' && guion.escenas.some((e) => e.direccion || e.inserto?.direccion)) console.warn('Aviso: eleven_multilingual_v2 puede leer las direcciones en voz alta; quítalas del guion o usa un modelo que admita etiquetas de audio.')
const conIdioma = idioma ? [idioma] : []
for (const t of tramos) {
  t.voz = voz(t.loc)
  const clave = createHash('sha1').update(JSON.stringify([t.voz.id, t.voz.estabilidad, model, t.envio, ...conIdioma])).digest('hex').slice(0, 12)
  t.mp3 = join(cache, `${clave}.mp3`); t.json = join(cache, `${clave}.json`)
  t.guardado = !rest.includes('--rehacer') && existsSync(t.mp3) && existsSync(t.json)
}
const insertos = guion.escenas.flatMap((e, i) => e.inserto ? [{ escena: i, loc: e.locutor || PRINCIPAL, ...e.inserto }] : [])
for (const ins of insertos) {
  ins.envio = (ins.direccion ? ins.direccion.trim() + ' ' : '') + ins.texto.trim()
  ins.voz = voz(ins.loc)
  const clave = createHash('sha1').update(JSON.stringify([ins.voz.id, ins.voz.estabilidad, model, ins.envio, ...conIdioma])).digest('hex').slice(0, 12)
  ins.mp3 = join(cache, `${clave}.mp3`); ins.json = join(cache, `${clave}.json`)
  ins.guardado = !rest.includes('--rehacer') && existsSync(ins.mp3) && existsSync(ins.json)
}
const gasta = [...tramos, ...insertos].filter((t) => !t.guardado).reduce((n, t) => n + t.envio.length, 0)
console.log(`${guion.escenas.length} escenas · ${tramos.length} tramo(s) · ${insertos.length} inserto(s) · ${gasta} caracteres a generar, direcciones incluidas (${model})`)
for (const t of tramos) console.log(`  ${t.loc}: ${t.envio.length} caracteres${t.guardado ? ' · guardado, no gasta' : ''}`)
for (const t of insertos) console.log(`  inserto tras la escena ${t.escena + 1} (${t.loc}): ${t.envio.length} caracteres${t.guardado ? ' · guardado, no gasta' : ''}`)

// Pide una locución a ElevenLabs con tiempos por carácter y la guarda en la caché
const pide = async (v, envio, mp3, json, loc) => {
  const r = await fetch(`${API}/text-to-speech/${v.id}/with-timestamps?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ text: envio, model_id: model, ...(idioma ? { language_code: idioma } : {}), voice_settings: { stability: v.estabilidad, similarity_boost: 0.75 } }),
  })
  if (!r.ok) die(`ElevenLabs ${r.status} (${loc}): ${await r.text()}`)
  const res = await r.json()
  writeFileSync(mp3, Buffer.from(res.audio_base64, 'base64'))
  writeFileSync(json, JSON.stringify({ locutor: loc, voz: v, modelo: model, ...(idioma ? { idioma } : {}), enviado: envio, alignment: res.alignment }, null, 1))
  return res.alignment
}

let chars, starts, ends, audio = null
if (rest.includes('--simular')) {
  // ~15 caracteres por segundo en español hablado sin prisa; las pausas en signos de puntuación
  chars = [...texto]; starts = []; ends = []; let t = 0.3
  for (const c of chars) { const d = /[.!?]/.test(c) ? 0.35 : /[,;:]/.test(c) ? 0.18 : 1 / 15; starts.push(t); t += d; ends.push(t) }
} else {
  if (!rest.includes('--si')) { console.log('No se ha generado nada. Repite con --si para gastar los créditos, o --simular para previsualizar.'); process.exit(0) }
  if (gasta) needKey()
  mkdirSync(cache, { recursive: true })
  const crudos = []; let offset = 0
  chars = []; starts = []; ends = []
  for (const [n, t] of tramos.entries()) {
    const a = t.guardado ? JSON.parse(readFileSync(t.json, 'utf8')).alignment : await pide(t.voz, t.envio, t.mp3, t.json, `tramo ${n + 1}, ${t.loc}`)
    crudos.push({ locutor: t.loc, enviado: t.envio, ...a })
    // Si la alineación trae las direcciones, se quitan con el mapa; si no las trae, ya coincide con el texto limpio
    const conDir = a.characters.join('') === t.envio
    const limpio = t.mapa.filter((m) => m >= 0).map((m) => texto[m]).join('')
    if (!conDir && a.characters.join('') !== limpio) console.warn(`Aviso: la alineación del tramo ${n + 1} no coincide con el texto; los cortes de escena son aproximados.`)
    if (n > 0) { chars.push(' '); starts.push(offset - PAUSA); ends.push(offset) }
    a.characters.forEach((c, k) => {
      if (conDir && t.mapa[k] < 0) return
      chars.push(c); starts.push(offset + a.character_start_times_seconds[k]); ends.push(offset + a.character_end_times_seconds[k])
    })
    const p = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', t.mp3], { encoding: 'utf8' })
    offset += Number(p.stdout.trim()) + PAUSA
  }
  // Un tramo: el mp3 tal cual. Varios: se unen con PAUSA s de silencio entre medias
  if (tramos.length === 1) writeFileSync(join(dir, 'voz.mp3'), readFileSync(tramos[0].mp3))
  else {
    const ins = tramos.flatMap((t) => ['-i', t.mp3])
    const fmt = 'aformat=sample_rates=44100:channel_layouts=mono'
    const filtro = tramos.map((_, i) => `[${i}:a]${fmt}[a${i}];` + (i ? `aevalsrc=0:d=${PAUSA}:s=44100,${fmt}[s${i}];` : '')).join('')
      + tramos.map((_, i) => `${i ? `[s${i}]` : ''}[a${i}]`).join('') + `concat=n=${tramos.length * 2 - 1}:v=0:a=1[out]`
    const r = spawnSync('ffmpeg', ['-hide_banner', '-y', ...ins, '-filter_complex', filtro, '-map', '[out]', '-ac', '1', '-b:a', '192k', join(dir, 'voz.mp3')], { encoding: 'utf8' })
    if (r.status !== 0) die(r.stderr.slice(-2000))
  }
  writeFileSync(join(dir, 'alineacion.json'), JSON.stringify(tramos.length === 1 ? crudos[0] : crudos, null, 1))
  audio = `reels/${cmd}/voz.mp3`
  // Insertos: su audio y sus palabras (sin la dirección), con tiempos relativos al principio del inserto
  const fuera = []
  for (const ins of insertos) {
    const a = ins.guardado ? JSON.parse(readFileSync(ins.json, 'utf8')).alignment : await pide(ins.voz, ins.envio, ins.mp3, ins.json, `inserto escena ${ins.escena + 1}`)
    const salta = a.characters.join('') === ins.envio ? ins.envio.length - ins.texto.trim().length : 0
    const pal = []; let w = null
    a.characters.forEach((c, k) => {
      if (k < salta) return
      if (/\s/.test(c)) { if (w) { pal.push(w); w = null } return }
      if (!w) w = { text: ' ' + c, startMs: Math.round(a.character_start_times_seconds[k] * 1000), endMs: 0 }
      else w.text += c
      w.endMs = Math.round(a.character_end_times_seconds[k] * 1000)
    })
    if (w) pal.push(w)
    const p = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', ins.mp3], { encoding: 'utf8' })
    fuera.push({ escena: ins.escena, texto: ins.texto, mp3: ins.mp3, durS: Number(p.stdout.trim()), palabras: pal })
  }
  writeFileSync(join(dir, 'insertos.json'), JSON.stringify(fuera, null, 1))
  if (chars.join('') !== texto) console.warn('Aviso: la alineación no coincide carácter a carácter con el texto; los cortes de escena son aproximados.')
}

// Caracteres → palabras en formato Caption de @remotion/captions (texto con su espacio delante, como pide Remotion)
const palabras = []; let cur = null
chars.forEach((c, i) => {
  if (/\s/.test(c)) { if (cur) { palabras.push(cur); cur = null } return }
  if (!cur) cur = { text: (palabras.length ? ' ' : '') + c, startMs: Math.round(starts[i] * 1000), endMs: 0, timestampMs: null, confidence: null, i }
  else cur.text += c
  cur.endMs = Math.round(ends[i] * 1000)
})
if (cur) palabras.push(cur)
for (const p of palabras) { p.timestampMs = Math.round((p.startMs + p.endMs) / 2) }

const at = (i, arr, fb) => Math.round(((arr[Math.min(i, arr.length - 1)] ?? fb)) * 1000)
const escenas = rangos.map(([a, b]) => ({ startMs: at(a, starts, 0), endMs: at(b - 1, ends, 0) }))
const duracionMs = Math.round(ends[ends.length - 1] * 1000)
for (const p of palabras) delete p.i

writeFileSync(join(dir, 'tiempos.json'), JSON.stringify({ audio, duracionMs, simulado: !audio, palabras, escenas }, null, 1))
console.log(`${palabras.length} palabras · ${(duracionMs / 1000).toFixed(1)} s${audio ? '' : ' (simulado, sin audio)'} → ${join(dir, 'tiempos.json')}`)
