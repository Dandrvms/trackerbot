import { Markup } from "telegraf"
import { deleteCache } from "../utils/deleteCache"
import { getUserState } from "../utils/userStates"

export default async (ctx) => {
    ctx.deleteMessage().catch(() => { })
    let text = "Al borrar caché, estás borrando:\n"
    text += "• El pin cifrado (se cachea 15min).\n"
    text += "• Tus post cacheados de /myposts (10min).\n"
    text += "• Los post cacheados de /scan (10min).\n"
    text += "• Tu estado actual en algún menú.\n\n"
    text += "Confirma que quieres borrar."

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('Borrar', 'delete_cache')],
        [Markup.button.callback('Cancelar', 'cancel')]
    ])
    ctx.reply(text, keyboard)
}

export function setUpDeleteCache(bot) {
    bot.action('delete_cache', async (ctx) => {
        ctx.deleteMessage().catch(() => { })
        const messageId = await ctx.reply("Borrando...")
        const userId = String(ctx.from.id)
        const state = await getUserState(userId)

        if(!state) { 
            return await ctx.editMessageText("No hay cache almacenada.", messageId) 
        }
        try {
            await deleteCache(userId, state.id)
            await ctx.editMessageText("Se ha borrado la caché.", messageId)
        } catch (e) {
            console.log(e)
            await ctx.editMessageText("Ocurrió un error al borrar caché.", messageId)
        }
    })
}