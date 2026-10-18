# Traspaso: la web a la cuenta de Almudena

Se le pasa una copia del repositorio a su cuenta de GitHub, y la publica su
Cloudflare con su dominio. El de meowrhino se queda como está, de copia
nuestra en `meowrhino.github.io/almarbra/` (sin indexar). Desde el
traspaso son dos repositorios separados: los cambios, en el suyo.

Todo viaja dentro del repositorio: el código, los JSON, las fotos y cómo se
publica (`wrangler.jsonc`). En su copia la Action no corre (lleva
`if: github.repository_owner == 'meowrhino'`) y el build, al no estar en
GitHub, publica en la raíz con el `url` de `site.json`.

Tiempo: unos 20 minutos, más lo que tarden los DNS.

## Antes

- [ ] `main` está al día y sin cambios a medias (`git status` limpio).
- [ ] Almudena tiene cuenta de GitHub. Su usuario: `<su-usuario>`.
- [ ] Almudena tiene cuenta de Cloudflare, y el dominio (`almudenagonzalez.com`, por ejemplo) a mano.

## 1. Su copia

- [ ] En su cuenta, **New repository** → `almarbra`, público y vacío (sin README ni licencia).
- [ ] Desde esta carpeta: `git push https://github.com/<su-usuario>/almarbra.git main`
      (si pide permiso, que nos añada antes como colaboradores, paso 3).

## 2. Cloudflare

- [ ] En su Cloudflare: **Workers & Pages → Create → Import a repository** → `<su-usuario>/almarbra`.
      Lo demás lo lee de `wrangler.jsonc` (instala sharp con `npm install`, build `node build/build.mjs`, sale `dist/`).
- [ ] **Settings → Domains & Routes → Add → Custom domain**: su dominio (y `www`, si lo quiere).
- [ ] En **su** repo, `data/site.json` → `"url": "https://almudenagonzalez.com"`. Commit y push
      a su repo (no al de meowrhino). Con eso deja de llevar `noindex`.

## 3. Que nos deje entrar

- [ ] GitHub, en su repo: Settings → Collaborators → `meowrhino`, con **Write** (no hace falta admin).
- [ ] Cloudflare: Manage account → Members → nos invita. Ahí se ve el error entero de un build que falla.

## 4. Comprobar en su dominio

- [ ] La portada (el mapa), `/textil/`, `/foto/`, `/about/` y un proyecto (`/projects/roma/`), y los mismos en `/en/` y `/ca/`.
- [ ] La ola al cambiar de página, y el mapa con sus fotos pequeñas (`/media/<slug>/mapa/`).
- [ ] `view-source:`: `canonical` y `og:url` con su dominio, y **sin** `<meta name="robots" content="noindex">`.
- [ ] `/robots.txt` dice `Allow` y `/sitemap.xml` tiene las direcciones de su dominio.
- [ ] Compartir un proyecto por WhatsApp: sale su foto (la og).

## 5. Search Console, con su cuenta de Google

- [ ] Dar de alta el dominio (el registro TXT, en el DNS de Cloudflare) y enviar `sitemap.xml`.

## 6. Almudena en su ordenador

Con él delante, siguiendo [GUIA.md](GUIA.md) ("La primera vez: preparar VS Code"):

- [ ] Clona **su** repositorio, no el de meowrhino.
- [ ] Live Server: **Go Live** y ve la vista previa.
- [ ] Un cambio pequeño (una coma en el about), Confirmar → Sincronizar, y la bolita verde en GitHub.

## 7. Al acabar

- [ ] Fila de oriol en `JAMstack/inventario.md` con las dos direcciones (github.io y su dominio).
- [ ] La copia de meowrhino sigue en github.io con `noindex`: no compite en Google. Si molesta,
      Settings → Pages → **Unpublish site** (el repo se queda).
