# Pendiente

## El vídeo de Valentina Rodriguez (2026-11-02)

`projects/valentina-rodriguez/img/1.webm`, 24 MB.

1. **almarbra.com no lo sirve a trozos.** A una petición `Range` Cloudflare
   (Workers static assets) contesta 200 con el archivo entero; GitHub Pages,
   206. Safari (Mac e iPhone) suele no reproducir un vídeo así: se queda en el
   fotograma. En Chrome, mover la línea de tiempo puede ir mal.
   Comprobar: `curl -sI -r 0-99 https://almarbra.com/media/projects/valentina-rodriguez/img/1.webm`
   (tiene que salir `206` y `content-range`).
   - Idea de manu: servir el vídeo desde GitHub Pages
     (`meowrhino.github.io/almarbra/media/…`), que sí acepta trozos. Ojo: la
     copia de Almudena dependería de la nuestra, que entonces no se puede
     despublicar, y un vídeo que ella cambie en su repo no llegaría.
   - Si no: un Worker pequeño que conteste a `Range` solo para `*.webm`
     (`run_worker_first`), o el vídeo en Vimeo.
2. **En /foto/ se baja aunque no se vea.** Con `autoplay`, el navegador no
   hace caso de `preload="metadata"` y empieza a cargarlo al entrar en la
   lista, esté donde esté. Servirlo desde GitHub Pages no lo arregla.
   - Lo más simple: en la lista, solo el fotograma, como en el mapa
     (`listItem` en `build/paginas.mjs`: `img({ ...cover, video: null }, …)`),
     y el vídeo solo en su página.
   - O que arranque cuando se ve (un IntersectionObserver).
3. **Probar en un iPhone de verdad**: es WebM VP8, y no está comprobado que
   Safari en iOS lo reproduzca aunque se arregle lo de los trozos.
