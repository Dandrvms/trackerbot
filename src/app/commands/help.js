export default (ctx) => {
    ctx.reply("webot sirve para rastrear los posts y " + 
        "respuestas en la web de webochan, además de publicar y navegar. Recibirás notificaciones y estarás " + 
        "al tanto de lo que se publique en los tablones que elijas o en las " + 
        "respuestas de los posts que quieras seguir.\n\n" +
        "Tras suscribirte a un tablón, recibirás notificaciones de nuevos posts en ese tablón.\n\n" +
        "Tras seguir un post, recibirás notificaciones de nuevas respuestas en ese post.\n\n" +
        "Estos son los comandos disponibles:\n" +
        "/start - Iniciar el bot\n" + 
        "/help - Desplegar este menú\n" + 
        "/sub - Notificar nuevos posts en un tablón\n" + 
        "/unsub - No más notificaciones\n" + 
        "/track - Notificar respuestas a un post\n" + 
        "/untrack - Dejar de seguir respuestas\n" + 
        "/mysubs - Ver tablones suscritos y posts seguidos\n" +
        "/post - Escribe un post para un tablón\n" +
        "/myposts - Administra tus posts enviados\n" +
        "/scan - Escanea un tablón y navega entre posts\n" +
        "/trackall - Sigue todos los comentarios en tus tablones subs\n" +
        "/untrackall - Cancela este seguimiento\n" +
        "/delcache - Borra tu cache cuando quieras\n\n" +
        "Aún faltan características, pero el bot está en desarrollo activo. ")
}