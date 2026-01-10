import { Telegraf } from 'telegraf';
import { Markup } from "telegraf";
import start from "@/app/back/commands/start.js";
import help from "@/app/back/commands/help.js";
import sub from "@/app/back/commands/sub.js";
import unsub from "@/app/back/commands/unsub.js";
import mysubs from "@/app/back/commands/mysubs.js";
import track from "@/app/back/commands/track.js";
import untrack from "@/app/back/commands/untrack.js"
import post, {setUpPostHandlers} from "@/app/back/commands/post.js"
// Obtén el token del bot desde las variables de entorno
const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN no está definido en el archivo .env");
}

// Crea una instancia del bot
const bot = new Telegraf(token);
setUpPostHandlers(bot)
console.log("Bot inicializado con éxito");

// Registrar comandos
bot.start(start);
bot.help(help);
bot.command('sub', sub);
bot.command('unsub', unsub);
bot.command('mysubs', mysubs);
bot.command('track', track);
bot.command('untrack', untrack);
bot.command('post', post);
// Respuesta genérica para mensajes no reconocidos
// bot.on('message', (ctx) => {
//   ctx.reply("Lo siento, no entiendo ese comando.");

// });




// bot.on('inline_query', async (ctx) => {
//   try {
//     const query = ctx.inlineQuery.query;

//     // 1. Regex mejorado para capturar saltos de línea [\s\S]*
//     const match = query.match(/^(webo|meta):\s*([\s\S]*)/i);

//     // Si no hay match o solo está el comando vacío, lista vacía y CACHE 0
//     if (!match) {
//       return await ctx.answerInlineQuery([], { cache_time: 0 });
//     }

//     const board = match[1];
//     const text = match[2].trim();

//     // 2. Si el usuario aún no escribe contenido
//     if (text.length < 1) {
//       return await ctx.answerInlineQuery([], {
//         cache_time: 0,
//         switch_pm_text: `Escribe algo`,
//         switch_pm_parameter: 'writing'
//       });
//     }

//     // 3. Generamos el resultado
//     const result = {
//       type: 'article',
//       // Generamos un ID que cambie con el texto para evitar colisiones de caché
//       id: Buffer.from(query).toString('base64').substring(0, 64),
//       title: `Publicar en /${board}/`,
//       description: `(${text.length} caracteres): ${text.substring(0, 50).replace(/\n/g, ' ')}...`,
//       input_message_content: {
//         message_text: text, // Enviamos el texto completo con párrafos
//         disable_web_page_preview: true
//       },
//       // Botón de URL (debe funcionar siempre)
//       reply_markup: {
//         inline_keyboard: [
//           [{ text: 'Publicar', callback_data: `post_${board}` }],
//           [{ text: 'Borrar', callback_data: `delete_post` }]
//         ]
//       }
//       // reply_markup: Markup.inlineKeyboard([[Markup.button.callback('Botón', 'dato_callback')]])
//     };

//     return await ctx.answerInlineQuery([result], { cache_time: 0 });

//   } catch (error) {
//     if (!error.description?.includes("query is too old")) {
//       console.error("Error en Inline Query:", error);
//     }
//   }
// });

bot.action('delete_post', async (ctx) => {
  try {
    await ctx.editMessageText("Publicacion cancelada.")
    await ctx.answerCbQuery("Post eliminado.")
  } catch (error) {
    console.log("Error al borrar: ", error)
    ctx.answerCbQuery("No se pudo borrar el mensaje.")
  }
})
// Configurar el webhook
const webhookUrl = `${process.env.URL}/api/telegram`; // URL pública del webhook
if (!process.env.URL) {
  throw new Error("URL no está definida en el archivo .env");
}

bot.telegram.setWebhook(webhookUrl)
  .then(() => {
    console.log(`Webhook configurado en: ${webhookUrl}`);
  })
  .catch((error) => {
    console.error('Error configurando el webhook:', error);
  });

export default bot;