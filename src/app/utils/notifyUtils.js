import { userStates, cache } from "@/app/utils/consts"
import { Markup } from "telegraf"
import { getConfirmationCommentMenu, clearUserState, getCachedPin } from "@/app/utils/utils"

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
        const userId = ctx.from.id
        const state = userStates[userId]

        if (!state) {
            safeAnswer(ctx)
            return
        }

        const messageId = ctx.callbackQuery.message.message_id;

        await ctx.editMessageText("Elige un PIN de 6 dígitos. Este PIN se usará para generar tu llave secreta. ⚠ Importante: No guardamos este PIN, si lo olvidas no podrás editar ni borrar tus mensajes. Anótalo o recuérdalo", Markup.inlineKeyboard([
            [Markup.button.callback('Cancelar', 'cancel')]
        ]))

        userStates[userId] = {
            ...state,
            step: 'waiting_pin_comment',
            menuMessageId: messageId
        };
        safeAnswer(ctx)
    })

    bot.action('reply', async (ctx) => {
        await apiComment(ctx)
    })

}


async function TrackPost(ctx, postId) {
    const userId = ctx.chat.id

    const response = await fetch(`${process.env.URL}/api/track`, {
        method: 'POST',
        headers: {
            'Content-Type': 'applicaction/json'
        },
        body: JSON.stringify({
            chatId: userId.toString(),
            postId: Number(postId)
        })

    })

    const { message, error } = await response.json()
    if (message) {
        ctx.reply(message)
    }
    if (error) {
        ctx.reply(error)
    }
}


const boardMenu = {
    text: "Envía el comentario al post. Puedes referenciar otras respuestas con >>:",
    keyboard: Markup.inlineKeyboard([
        [Markup.button.callback('cancelar', 'cancel')]
    ])
}

async function ReplyPost(ctx, postId, boardId) {
    const userId = ctx.from.id
    const sentMsg = await ctx.reply(boardMenu.text, boardMenu.keyboard);
    userStates[userId] = {
        step: 'waiting_text_comment',
        menuMessageId: sentMsg.message_id,
        postId: postId,
        boardId: boardId
    };
}


export async function apiComment(ctx) {
    const userId = ctx.from.id
    const state = userStates[userId]
    const pin = await getCachedPin(userId)

    if (!pin) {
        return ctx.answerCbQuery("Sesión expirada. Ingresa tu PIN nuevamente.")
    }

    if (!state || state.step !== 'waiting_confirmation' && state.step !== 'waiting_pin_comment') {
        // console.log(state.step)
        return ctx.answerCbQuery("Error: Sesión no válida.");
    }

    try {

        const { content, menuMessageId, postId, boardId } = state

        const response = await fetch(`${process.env.URL}/api/comment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                postId: postId,
                content: content,
                pin: pin,
                user: userId.toString()
            })
        })
        if (response.status != 200) {
            console.log("Error en la API al comentar: ", await response.text())
            return ctx.telegram.editMessageText(ctx.chat.id, menuMessageId, null, "Error al responder al post. Inténtalo más ahorita.", getConfirmationCommentMenu(ctx.chat.id))
        }

        const { cont, id } = await response.json()
        await ctx.telegram.editMessageText(ctx.chat.id, menuMessageId, null, "Comentario enviado con éxito.")
        clearUserState(userId);

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
    } catch (error) {
        console.log("Error: ", error)
    }
}