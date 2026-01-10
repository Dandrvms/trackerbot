# Trackerbot

Bot de telegram para hacer seguimiento a lo que se publique en una web como [webochan](https://webochan.vercel.app).

### Características
* __Seguimiento__: Recibe notificaciones cada vez que se realice un nuevo post en los tablones de tu elección.
  * Hilos: Recibe notificaciones por cada comentario hecho a las publicaciones de elección.
* __Scrape__: Realiza búsqueda de posts inline, obtén los posts más recientes, los más populares, entre otros.
* __Post__: Postea desde el bot y responde a comentarios sin salir de telegram.

### .env
En el archivo .env del directorio raíz debe ir lo siguiente:
* TELEGRAM_BOT_TOKEN="EL TOKEN QUE TE DA EL BOTFATHER"
* WEB_TOKEN="TOKEN ESPECIAL PARA LA COMUNICACIÓN CON LA WEB"

* URL="URL DONDE ESTA ALOJADO EL BOT PARA CONFIGURAR EL WEBHOOK"
* DATABASE_URL="URL DE LA BASE DE DATOS"
* WEB_URL="URL DE LA WEB DE LA FORMA: https://web.com/board"
* SCRAPE_URL="URL BASE DE LA WEB DE LA FORMA: htts://web.com"
