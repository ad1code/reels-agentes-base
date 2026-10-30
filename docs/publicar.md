# Publicar un reel

Lo hace el agente `publicador`, solo cuando el humano lo pide y con el vídeo ya revisado.

## Requisitos
- El vídeo y la portada en `out/`, revisados por el humano.
- Los datos de publicación aprobados en `public/reels/<slug>/` (por ejemplo, un `publicacion.json` con vídeo, portada, texto, hashtags y ajustes). <!-- RELLENA: nombre y campos de tu archivo de publicación. -->
- Un MCP de navegador (por ejemplo, chrome-devtools MCP) configurado **solo para este proyecto**, con un perfil de navegador propio y persistente. <!-- RELLENA: nombre del MCP y ruta del perfil. -->
- **La sesión la inicia el humano**, a mano, en ese perfil y con el MCP parado. El agente nunca ve ni teclea contraseñas.
- Ese perfil no se usa para nada más que publicar y leer métricas.

## Pasos
La interfaz de las redes cambia a menudo: los nombres de los botones son orientativos.

1. Antes de **cada** clic, un snapshot nuevo para localizar el elemento real. Nunca dos clics con el mismo snapshot.
2. Abrir la página de subida de la red. Si pide entrar, parar y pedir al humano que inicie sesión.
3. Subir el vídeo con la herramienta de subida de archivos del MCP. Esperar a que cargue.
4. Recorte: el vertical original, nunca cuadrado.
5. Portada: la imagen de `out/` si la red deja subirla; si no, el fotograma más cercano al gancho.
6. Texto y hashtags, tal cual están aprobados. Comprobar que entraron completos.
7. Ajustes: etiqueta de contenido generado con IA si la voz o la imagen lo son; compartir en otras redes, solo si se pidió.
8. **Parar.** Enseñar al humano el texto exacto, los hashtags, la portada y los ajustes. Esperar un OK explícito en el chat.
9. Con el OK: publicar. Esperar la confirmación y copiar el enlace.
10. Devolver fecha, hora, enlace y ajustes para `public/reels/<slug>/publicado.md`.

<!-- RELLENA: lo que vayas comprobando de tu plataforma (cómo entra el texto, cómo se sube la portada), con la fecha en que lo comprobaste. -->

## Métricas
1. A los <!-- RELLENA: días --> días, abrir las estadísticas del reel.
2. Copiar los datos que ofrezca, con la fecha de lectura.
3. Proponer como mucho tres cambios, cada uno atado a un dato.

## Riesgos
- Las condiciones de las redes suelen limitar el uso automatizado. Por eso: un reel cada vez, ritmo de persona, sin bucles ni reintentos en serie, y la publicación final siempre con OK humano.
- Si aparece una verificación, un captcha o algo inusual: parar y avisar. No intentar sortearlo.
