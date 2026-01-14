import { Markup } from "telegraf";
import { userStates } from "@/app/utils/utils";

const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('Cancelar', 'cancel')]
]);

export default async (ctx) => {
    const chatId = String(ctx.chat.id)
    ctx.deleteMessage().catch(() => { });
    const sentMsg = await ctx.reply("Escribe el PIN que enviaste cuando publicaste tus posts.", keyboard);
    userStates[ctx.from.id] = { step: 'myposts_waiting_pin', menuMessageId: sentMsg.message_id };

}


