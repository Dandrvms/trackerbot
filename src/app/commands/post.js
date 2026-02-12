//postear en un tablón desde el bot
import { Markup } from "telegraf";
import { getConfirmationMenu, getCachedPin } from "@/app/utils/utils";
// import { userStates, cache } from "@/app/utils/consts"
import { post } from "@/app/external/post";

import { getUserState, updateUserState } from "../utils/userStates";
import { replaceMenu, getMenu } from "../utils/menus";
import { getComments, getPosts } from "./scan";




export default async (ctx) => {
    ctx.deleteMessage().catch(() => { });
    const sentMenu = await ctx.reply(boardMenu.text, boardMenu.keyboard);
    const state = await updateUserState(String(ctx.from.id), { step: 'selecting_board' })
    await replaceMenu(state.id, sentMenu.message_id, { type: 'dialog_menu' })
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


export async function sendPost(ctx) {
    const userId = String(ctx.from.id)
    // const state = userStates[userId]
    const state = await getUserState(userId)
    const pin = await getCachedPin(userId)
    const menu = await getMenu(state.id)

    if (!state || !menu) {
        return ctx.answerCbQuery("Sesión expirada o inválida.")
    }


    if (!pin) {
        return ctx.answerCbQuery("Sesión expirada. Ingresa tu PIN nuevamente.")
    }

    if (!state || state.step !== 'waiting_confirmation' && state.step !== 'waiting_pin') {
        return ctx.answerCbQuery("Error: Sesión no válida.");
    }

    try {

        const { boardId, content } = state

        const { error, id, cont } = await post(content, boardId, pin, userId.toString(), state.id)

        if (error) {
            console.log("Error en la API al postear: ", await response.text())
            return ctx.telegram.editMessageText(ctx.chat.id, menu.messageId, null, "Error al publicar el post. Inténtalo más ahorita.", getConfirmationMenu(ctx.chat.id))
        }

        await ctx.telegram.editMessageText(ctx.chat.id, menu.messageId, null, "Post enviado con éxito.")
        // clearUserState(userId);


        const notif = await fetch(`${process.env.URL}/api/notify/post`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.WEB_TOKEN}`
            },
            body: JSON.stringify({
                content: cont,
                id: id,
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

export function setUpPostHandlers(bot) {
    bot.action(/post:(.*)/, async (ctx) => {
        try {
            const boardId = ctx.match[1]
            const userId = String(ctx.from.id)
            const state = await getUserState(userId)
            const menu = await getMenu(state.id)
            if (!state || !menu) {
                return ctx.answerCbQuery("Sesión expirada o inválida.")
            }


            const sentMenu = await ctx.editMessageText(`Envíame el texto para publicar en ${boardId}:`, Markup.inlineKeyboard([
                [Markup.button.callback('volver', 'back'),
                Markup.button.callback('cancelar', 'cancel')

                ]
            ]))




            await updateUserState(userId, {
                step: 'waiting_text',
                boardId: boardId,
            })

            await replaceMenu(state.id, sentMenu.message_id, { type: 'cancel_menu' })

            // const state = userStates[userId]
            // userStates[userId] = {
            //     ...state,
            //     step: 'waiting_text',
            //     board: board,
            //     menuMessageId: sentMenu.message_id
            // };

            await ctx.answerCbQuery();

        } catch (error) {
            console.log("Error: ", error)
            ctx.editMessageText("Error al seleccionar tablón, intenta de nuevo.")
        }
    })


    bot.action('back', async (ctx) => {
        const userId = String(ctx.from.id);
        // const state = userStates[userId];
        const state = await getUserState(userId)


        if (state && state.step === 'waiting_confirmation') {


            const sentMenu = await ctx.editMessageText(`Envíame el nuevo texto para /${state.boardId}/:`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('cancelar', 'cancel')]
                ])
            );

            await updateUserState(userId, {
                step: 'waiting_text',
                boardId: state.boardId,
                content: undefined
            })

            await replaceMenu(state.id, sentMenu.message_id, { type: 'cancel_menu' })

            // userStates[userId] = {
            //     ...state,
            //     step: 'waiting_text',
            //     menuMessageId: sentMenu.message_id,
            //     content: undefined
            // };

        } else {

            // clearUserState(userId);
            await ctx.editMessageText(boardMenu.text, boardMenu.keyboard);
        }
        await ctx.answerCbQuery();
    })

    bot.action('cancel', async (ctx) => {
        // clearUserState(ctx.from.id);
        const state = await getUserState(ctx.from.id.toString())
        const menu = await getMenu(state.id)
        if (!state || !menu) {
            return ctx.answerCbQuery("Sesión expirada o inválida.")
        }

        ctx.deleteMessage();

        if (state.previousStep) {
            const newState = await updateUserState(String(ctx.from.id), { step: state.previousStep, previousStep: null })
            const sentMsg = await ctx.reply('Volviendo al menú anterior...')
            const newMenu = await replaceMenu(state.id, sentMsg.message_id, { type: 'waiting', currentPage: menu.currentPage })
            newState.step === 'viewing_post' ? await getPosts(ctx, newMenu.currentPage) : await getComments(ctx, newMenu.currentPage)
        }


    });


    bot.action('send', async (ctx) => {

        await sendPost(ctx)

    })

    bot.action('pin', async (ctx) => {
        const userId = String(ctx.from.id)
        // const state = userStates[userId]
        const state = await getUserState(userId)

        if (!state) {
            await ctx.answerCbQuery("Sesión expirada.")
            return
        }

        const messageId = ctx.callbackQuery.message.message_id;

        await ctx.editMessageText("Elige un PIN de 6 dígitos. Este PIN se usará para generar tu llave secreta. ⚠ Importante: No guardamos este PIN, si lo olvidas no podrás editar ni borrar tus mensajes. Anótalo o recuérdalo", Markup.inlineKeyboard([
            [Markup.button.callback('Cancelar', 'cancel')]
        ]))

        await updateUserState(userId, {
            step: 'waiting_pin',
        })
        await replaceMenu(state.id, messageId, { type: 'cancel_menu' })

        // userStates[userId] = {
        //     ...state,
        //     step: 'waiting_pin',
        //     menuMessageId: messageId
        // };
        await ctx.answerCbQuery();
    })
}