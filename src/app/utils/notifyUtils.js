
import { Markup } from "telegraf"
import { getConfirmationCommentMenu, clearUserState, getCachedPin, safeEditMessageText } from "@/app/utils/utils"
import { track } from "@/app/external/track"
import { comment } from "@/app/external/comment"
import { getUserState, updateUserState } from "../utils/userStates";
import { replaceMenu, getMenu } from "../utils/menus";
import { getComments, getPosts } from "../commands/scan";

const safeAnswer = async (ctx) => {
    try { await ctx.answerCbQuery() } catch (e) { console.log("Query expirada") }
}

export async function handleNotifications(bot) {
    bot.action(/^track_(\d+)$/, async (ctx) => {
        const postId = ctx.match[1]
        console.log("tracking post", postId)
        await TrackPost(ctx, postId)
        try {
            await ctx.answerCbQuery()
        } catch (e) {
            console.log(e)
        }
    })

    bot.action(/^reply_post_(\d+)_(.+)$/, async (ctx) => {
        const postId = ctx.match[1]
        const boardId = ctx.match[2]
        console.log("replying post", postId)
        await ReplyPost(ctx, postId, boardId)
        safeAnswer(ctx)
    })

    bot.action(/^reply_comment_(\d+)_(.+)$/, async (ctx) => {
        const postId = ctx.match[1]
        const boardId = ctx.match[2]
        console.log("replying comment", postId)
        await ReplyPost(ctx, postId, boardId)
        safeAnswer(ctx)
    })


    bot.action('comment_pin', async (ctx) => {
        const userId = String(ctx.from.id)
        // const state = userStates[userId]
        const state = await getUserState(userId)

        if (!state) {
            safeAnswer(ctx)
            return
        }

        const messageId = ctx.callbackQuery.message.message_id;

        await ctx.editMessageText("Elige un PIN de 6 dígitos. Este PIN se usará para generar tu llave secreta. ⚠ Importante: No guardamos este PIN, si lo olvidas no podrás editar ni borrar tus mensajes. Anótalo o recuérdalo", Markup.inlineKeyboard([
            [Markup.button.callback('Cancelar', 'cancel')]
        ]))

        // userStates[userId] = {
        //     ...state,
        //     step: 'waiting_pin_comment',
        //     menuMessageId: messageId
        // };

        await updateUserState(userId, { step: 'waiting_pin_comment' })
        await replaceMenu(state.id, messageId, { type: 'cancel_menu' })
        safeAnswer(ctx)
    })

    bot.action('reply', async (ctx) => {
        await sendComment(ctx)
    })

}


async function TrackPost(ctx, postId) {
    const userId = ctx.chat.id.toString()

    const { error, message } = await track(userId.toString(), Number(postId))



    if (message) {
        ctx.reply(message)
    }
    if (error) {
        ctx.reply(error)
    }
}




async function ReplyPost(ctx, postId, boardId) {
    const userId = String(ctx.from.id)
    const state = await getUserState(userId)
    const menu = await getMenu(state.id)

    const boardMenu = {
        text: `'${state.content}' \n\nEnvía el comentario al post. Puedes referenciar otras respuestas con >>:`,
        keyboard: Markup.inlineKeyboard([
            [Markup.button.callback('cancelar', 'cancel')]
        ])
    }

    
    // const state = userStates[userId]
    // userStates[userId] = {
    //     ...state,
    //     step: 'waiting_text_comment',
    //     menuMessageId: sentMsg.message_id,
    //     postId: postId,
    //     boardId: boardId
    // };

    let patch
    let menuPatch
    if (state.step === 'viewing_post' || state.step === 'viewing_comment_detail') {
        patch = { previousStep: state.step }
        menuPatch = { currentPage: menu.currentPage }
        await ctx.deleteMessage().catch(() => { })
    }
    const sentMsg = await ctx.reply(boardMenu.text, boardMenu.keyboard);

    await updateUserState(userId, { ...patch, step: 'waiting_text_comment', postId: Number(postId), boardId: boardId })
    await replaceMenu(state.id, sentMsg.message_id, { ...menuPatch, type: 'cancel_menu' })
}


export async function sendComment(ctx) {
    const userId = String(ctx.from.id)
    // const state = userStates[userId]
    const state = await getUserState(userId)
    const pin = await getCachedPin(userId)
    const menu = await getMenu(state.id)

    if (!pin) {
        return ctx.answerCbQuery("Sesión expirada. Ingresa tu PIN nuevamente.")
    }

    if (!state || state.step !== 'waiting_confirmation' && state.step !== 'waiting_pin_comment') {
        // console.log(state.step)
        return ctx.answerCbQuery("Error: Sesión no válida.");
    }

    try {

        const { content, postId, boardId } = state

        const { error, cont, id } = await comment(postId, content, pin, userId.toString())


        if (error) {
            console.log("Error en la API al comentar: ", error)
            return ctx.telegram.editMessageText(ctx.chat.id, menu.messageId, null, "Error al responder al post. Inténtalo más ahorita.", getConfirmationCommentMenu(ctx.chat.id))
        }

        await ctx.telegram.editMessageText(ctx.chat.id, menu.messageId, null, "Comentario enviado con éxito.")
        // clearUserState(userId);



        const notif = await fetch(`${process.env.URL}/api/notify/comment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.WEB_TOKEN}`
            },
            body: JSON.stringify({
                content: cont,
                id: id,
                postId: Number(postId),
                boardId: boardId
            })
        })

        if (state.previousStep) {
            const newState = await updateUserState(userId, { step: state.previousStep, previousStep: null })
            const sentMsg = await ctx.reply('Volviendo al menú anterior...')
            const newMenu = await replaceMenu(state.id, sentMsg.message_id, { type: 'waiting', currentPage: menu.currentPage })
            newState.step === 'viewing_post' ? await getPosts(ctx, newMenu.currentPage) : await getComments(ctx, newMenu.currentPage)
        }
    } catch (error) {
        console.log("Error: ", error)
    }
}