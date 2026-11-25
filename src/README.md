# Fuentes de MUSICA Groovebox

La app publicada (`../index.html`) es un solo HTML armado desde estas fuentes.

## Estructura
- `parts/p1.html`: CSS y markup (`<head>`, vistas SEQ/TECLAS/MIX/FX/SMP, hojas SESIONES, LIVE y XY).
- `parts/p2.js`: motor de audio (Web Audio). Incluye:
  - voces, baterías renderizadas por kit y edición por golpe
  - sampler CHOP/PADS, secuenciador, partes A–D
  - snapshot/applySnapshot y guardado local
- `parts/p3.js`: interfaz. Incluye:
  - sliders y paneles de AJUSTES, anillo, XY y mixer
  - sesiones (biblioteca en IndexedDB + Drive), LIVE y gráficos canvas
- `gb.txt`: la línea `window.GB={…}` que se inyecta en el build, con las exportaciones para los tests.
- `build.py <ver>`: arma `build/MUSICA-GROOVEBOX-MOBILE-v<ver>.html`.
- `mkpwa.py <ver>`: genera `../index.html` (manifest, iconos, service worker) y cambia la versión de caché en `../sw.js`.
- `mkicons.js`: genera los iconos desde el isotipo.
- `tests/`: pruebas con Playwright y Chrome headless:
  - `t37`: biblioteca, LIVE, baterías y mixer
  - `t38`: sampler PADS
  - `t1q`: regresión general
  - `t43`: v13.16 — sampler con SYNC al tempo (REPITCH / ESTIRAR con WSOLA en un worker) y SPEED; luces del secuenciador en TECLAS y SMP
  - `t44`: v13.32 — zoom por pellizco en la onda, AUTO CUE, SAMPLER 2 (canal en el mixer, renglón SMP 2, SALIDA por chop/pad)
  - `t45`: v13.32 — SCRATCH con el bailarín (v13.32: AudioWorklet por canal ANTES de los efectos, la SIRENA queda afuera, últimos 10 s; pausa y retoma el secuenciador)
  - `t46`: v13.32 — modo DJ: el anillo del secuenciador como plato (aguja arriba, gira horario, tocar frena, girar scratchea)
  - `t47`: v13.32 — vista DJ (solo patrones, sin selector), DELAY/FILTER/REVERB como pad XY, SIREN como pad XY
  - `t48`: v13.32 — mixer con DLY/REV grandes y PAN chica; CADENA DE FX como patch de cables (presets, conectar/desenchufar, sin lazos, sesión)
  - `t49`: v13.32 — sampler con 8 pads, fila de fuentes compacta, AJUSTES muestra los parámetros y achata los pads
  - `t50`: v13.32 — CADENA con dos modos: ENVÍOS y SALIDA (FILTER/DIST/REPEAT del pad y tiradas DELAY/REVERB), protección de camino al master
  - `t51`: v13.32 — DESCONECTAR en la CADENA: módulo (puenteando), todo y cable
  - `t52`: v13.32 — SALIDA: DELAY y REVERB del pad con IN y OUT (unidades propias), migración de sesiones
  - `t53`: v13.32 — los retornos de ENVÍOS pasan por la cadena de SALIDA (pad XY)
  - `t54`: v13.32 — HOLD por efecto en el pad XY (varios trabados a la vez)
  - `t55`: v13.32 — botón KILL (para el tema, suelta todo y corta las colas)
  - `t56`: v13.32 — sin BORRAR; ↶ deshacer (2 pasos) y ↷ rehacer
  - `t57`: v13.32 — CHOP = canal 1 con hasta 3 samples (selector + ASIGNAR) · PADS = canal 2 · sin DEMO/RESAMP/2 CANALES
  - `t42`: v13.15 — carpeta del TELÉFONO en la app instalada (File System Access, probado con OPFS) y versión en el menú
  - `t41`: v13.14 — sesiones en una carpeta de Drive (Drive simulado): GUARDAR, ÚLTIMAS 5, autoguardado _AS_, tomas a TOMAS
  - `t40`: v13.13 — movimiento sobre la tecla grabado en el secuenciador, GATE de SYN
  - `t39`: v13.11–13.12 — compensación de latencia y calibración, swing, VINTAGE con 5 carriles y GATE por tiempo apretado, 32 pasos, tempo por arrastre, contador y la paleta del anillo

## Publicar una versión
```bash
cd src
python3 build.py 13.32          # arma el HTML
for t in t37 t38 t1q t39 t40 t41 t42 t43 t44 t45 t46 t47 t48 t49 t50 t51 t52 t53 t54 t55 t56 t57; do V=13.32 node tests/$t.js; done   # pruebas (necesitan playwright + /usr/bin/google-chrome)
python3 mkpwa.py 13.32          # actualiza ../index.html y ../sw.js
cd .. && git add -A && git commit -m "v13.11: …" && git push
```
GitHub Pages publica en 1–2 minutos. La app instalada se actualiza la próxima vez que se abre con internet.

## Convenciones
- Los cambios se hacen con scripts Python de reemplazo exacto (`sub(archivo, viejo, nuevo)` que verifica cuántas veces aparece el texto). Antes de cada versión se hace un backup de `parts/`.
- Interfaz en español rioplatense, estética AUM/SECTOR: carbón cálido, líneas finas, acento `#ff9440`, Helvetica Neue light.
- No publicar nada con API keys. Este repo es público.
