export default (ctx) => {
    ctx.reply("Webochan bot, también llamado Trackerbot, " + 
        "sirve para rastrear los posts y " + 
        "respuestas en la web de webochan. Recibirás notificaciones y estarás " + 
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
        "/mysubs - Ver tablones suscritos y posts seguidos")
}