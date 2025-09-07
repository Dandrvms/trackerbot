import { Telegraf } from 'telegraf';
import start from "@/app/back/commands/start.js";
import help from "@/app/back/commands/help.js";
import sub from "@/app/back/commands/sub.js";
import unsub from "@/app/back/commands/unsub.js";
import mysubs from "@/app/back/commands/mysubs.js";
import track from "@/app/back/commands/track.js";
import untrack from "@/app/back/commands/untrack.js"
// Obtén el token del bot desde las variables de entorno
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN no está definido en el archivo .env");
}

// Crea una instancia del bot
const bot = new Telegraf(token);
console.log("Bot inicializado con éxito");

// Registrar comandos
bot.start(start);
bot.help(help);
bot.command('sub', sub);
bot.command('unsub', unsub);
bot.command('mysubs', mysubs);
bot.command('track', track);
bot.command('untrack', untrack);
// Respuesta genérica para mensajes no reconocidos
bot.on('message', (ctx) => {
  ctx.reply("Lo siento, no entiendo ese comando.");
  
});

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