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
  - `t44`: v13.17 — zoom por pellizco en la onda, AUTO CUE, SAMPLER 2 (canal en el mixer, renglón SMP 2, SALIDA por chop/pad)
  - `t42`: v13.15 — carpeta del TELÉFONO en la app instalada (File System Access, probado con OPFS) y versión en el menú
  - `t41`: v13.14 — sesiones en una carpeta de Drive (Drive simulado): GUARDAR, ÚLTIMAS 5, autoguardado _AS_, tomas a TOMAS
  - `t40`: v13.13 — movimiento sobre la tecla grabado en el secuenciador, GATE de SYN
  - `t39`: v13.11–13.12 — compensación de latencia y calibración, swing, VINTAGE con 5 carriles y GATE por tiempo apretado, 32 pasos, tempo por arrastre, contador y la paleta del anillo

## Publicar una versión
```bash
cd src
python3 build.py 13.17          # arma el HTML
for t in t37 t38 t1q t39 t40 t41 t42 t43 t44; do V=13.17 node tests/$t.js; done   # pruebas (necesitan playwright + /usr/bin/google-chrome)
python3 mkpwa.py 13.17          # actualiza ../index.html y ../sw.js
cd .. && git add -A && git commit -m "v13.11: …" && git push
```
GitHub Pages publica en 1–2 minutos. La app instalada se actualiza la próxima vez que se abre con internet.

## Convenciones
- Los cambios se hacen con scripts Python de reemplazo exacto (`sub(archivo, viejo, nuevo)` que verifica cuántas veces aparece el texto). Antes de cada versión se hace un backup de `parts/`.
- Interfaz en español rioplatense, estética AUM/SECTOR: carbón cálido, líneas finas, acento `#ff9440`, Helvetica Neue light.
- No publicar nada con API keys. Este repo es público.
