//postear en un tablón desde el bot
import { Markup } from "telegraf";
import { clearUserState, getConfirmationMenu, getCachedPin } from "@/app/utils/utils";
import { userStates, cache } from "@/app/utils/consts"



export default async (ctx) => {
    ctx.deleteMessage().catch(() => { });
    await ctx.reply(boardMenu.text, boardMenu.keyboard);
}



const boardMenu = {
    text: "Escoge el tablón en el que quieres publicar:",
    keyboard: Markup.inlineKeyboard([
        [Markup.button.callback('/webo/', 'post:webo'),
        Markup.button.callback('/meta/', 'post:meta')],
        [Markup.button.callback('/test/', 'post:test')],

        [Markup.button.callback('cancelar', 'cancel')]
    ])
}


export async function apiPost(ctx) {
    const userId = ctx.from.id
    const state = userStates[userId]
    const pin = await getCachedPin(userId)

    if (!pin) {
        return ctx.answerCbQuery("Sesión expirada. Ingresa tu PIN nuevamente.")
    }

    if (!state || state.step !== 'waiting_confirmation' && state.step !== 'waiting_pin') {
        return ctx.answerCbQuery("Error: Sesión no válida.");
    }

    try {

        const { board, content, menuMessageId } = state

        const response = await fetch(`${process.env.URL}/api/post`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                board: board,
                content: content,
                pin: pin,
                user: userId.toString()
            })
        })
        if (response.status != 200) {
            console.log("Error en la API al postear: ", await response.text())
            return ctx.telegram.editMessageText(ctx.chat.id, menuMessageId, null, "Error al publicar el post. Inténtalo más ahorita.", getConfirmationMenu(ctx.chat.id))
        }

        const { cont, id } = await response.json()
        await ctx.telegram.editMessageText(ctx.chat.id, menuMessageId, null, "Post enviado con éxito.")
        clearUserState(userId);

        const notif = await fetch(`${process.env.URL}/api/notify/post`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.WEB_TOKEN}`
            },
            body: JSON.stringify({
                content: cont,
                id: id,
                boardId: board
            })
        })
    } catch (error) {
        console.log("Error: ", error)
    }
}

export function setUpPostHandlers(bot) {
    bot.action(/post:(.*)/, async (ctx) => {
        try {
            const board = ctx.match[1]
            const userId = ctx.from.id


            const sentMenu = await ctx.editMessageText(`Envíame el texto para publicar en ${board}:`, Markup.inlineKeyboard([
                [Markup.button.callback('volver', 'back'),
                Markup.button.callback('cancelar', 'cancel')

                ]
            ]))

            userStates[userId] = {
                step: 'waiting_text',
                board: board,
                menuMessageId: sentMenu.message_id
            };

            await ctx.answerCbQuery();

        } catch (error) {
            console.log("Error: ", error)
            ctx.editMessageText("Error al seleccionar tablón, intenta de nuevo.")
        }
    })


    bot.action('back', async (ctx) => {
        const userId = ctx.from.id;
        const state = userStates[userId];

        if (state && state.step === 'waiting_confirmation') {


            const sentMenu = await ctx.editMessageText(`Envíame el nuevo texto para /${state.board}/:`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('cancelar', 'cancel')]
                ])
            );

            userStates[userId] = {
                ...state,
                step: 'waiting_text',
                menuMessageId: sentMenu.message_id,
                content: undefined
            };

        } else {

            clearUserState(userId);
            await ctx.editMessageText(boardMenu.text, boardMenu.keyboard);
        }
        await ctx.answerCbQuery();
    })

    bot.action('cancel', (ctx) => {
        clearUserState(ctx.from.id);
        ctx.deleteMessage();

    });


    bot.action('send', async (ctx) => {

        await apiPost(ctx)
        
    })  

bot.action('pin', async (ctx) => {
    const userId = ctx.from.id
    const state = userStates[userId]

    if (!state) {
        await ctx.answerCbQuery("Sesión expirada.")
        return
    }

    const messageId = ctx.callbackQuery.message.message_id;

    await ctx.editMessageText("Elige un PIN de 6 dígitos. Este PIN se usará para generar tu llave secreta. ⚠ Importante: No guardamos este PIN, si lo olvidas no podrás editar ni borrar tus mensajes. Anótalo o recuérdalo", Markup.inlineKeyboard([
        [Markup.button.callback('Cancelar', 'cancel')]
    ]))

    userStates[userId] = {
        ...state,
        step: 'waiting_pin',
        menuMessageId: messageId
    };
    await ctx.answerCbQuery();
})
}