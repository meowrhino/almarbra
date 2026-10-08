/* Rehace dist/ cada vez que cambia algo de content/, css/, js/ o build/.
   Para trabajar con Live Server de VS Code, que sirve dist/ (ver
   .vscode/settings.json) y recarga el navegador cuando dist/ cambia.

     node build/watch.mjs      (npm run watch)

   VS Code lo arranca solo al abrir la carpeta (.vscode/tasks.json; la
   primera vez pregunta si se permite). */

import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const BUILD = join(ROOT, 'build', 'build.mjs');

let timer = null;
let running = false;
let again = false;

function build() {
  if (running) { again = true; return; }
  running = true;
  spawn(process.execPath, [BUILD], { stdio: ['ignore', 'ignore', 'inherit'] }).on('exit', (code) => {
    console.log(code ? '✗ build fallido' : `✓ ${new Date().toLocaleTimeString()}`);
    running = false;
    if (again) { again = false; build(); }
  });
}

for (const dir of ['content', 'css', 'js', 'build']) {
  watch(join(ROOT, dir), { recursive: true }, (_, file) => {
    if (file?.includes('.media-cache')) return;   // la escribe la ingesta, no cambia la web
    clearTimeout(timer);
    timer = setTimeout(build, 150);
  });
}

build();
console.log('mirando content/, css/, js/ y build/…');
