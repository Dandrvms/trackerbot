import { Telegraf } from 'telegraf';
import start from "@/app/commands/start.js";
import help from "@/app/commands/help.js";
import sub from "@/app/commands/sub.js";
import unsub from "@/app/commands/unsub.js";
import mysubs from "@/app/commands/mysubs.js";
import track from "@/app/commands/track.js";
import untrack from "@/app/commands/untrack.js"
import post, {setUpPostHandlers} from "@/app/commands/post.js"
import myposts from "@/app/commands/myposts.js";
import trackall from '@/app/commands/trackall';
import untrackall from '@/app/commands/untrackall'
import scan from '@/app/commands/scan'
import { handleInput } from '@/app/utils/utils';
import { handleNavigation } from '@/app/commands/myposts.js';
import { handleNotifications } from '@/app/utils/notifyUtils';
import { handleScan } from '@/app/commands/scan';
const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN no está definido en el archivo .env");
}


const bot = new Telegraf(token);
// configurar el webhook
const webhookUrl = `${process.env.URL}/api/telegram`; 
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
setUpPostHandlers(bot)
handleInput(bot)
handleNavigation(bot)
handleNotifications(bot)
handleScan(bot)
console.log("Bot inicializado con éxito");


bot.start(start);
bot.help(help);
bot.command('sub', sub);
bot.command('unsub', unsub);
bot.command('mysubs', mysubs);
bot.command('track', track);
bot.command('untrack', untrack);
bot.command('post', post);
bot.command('myposts', myposts);
bot.command('trackall', trackall)
bot.command('untrackall', untrackall)
bot.command('scan', scan)

export default bot;