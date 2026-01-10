//postear en un tablón desde el bot

import { Markup } from "telegraf";



const boardMenu = {
    text: "Escoge el tablón en el que quieres publicar:",
    keyboard: Markup.inlineKeyboard([
        [Markup.button.callback('/webo/', 'post:webo'),
        Markup.button.callback('/meta/', 'post:meta')],

        [Markup.button.callback('cancelar', 'cancel')]
    ])
}

const userStates = {}

export default async function post(ctx) {
    ctx.reply(boardMenu.text, boardMenu.keyboard);
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

            delete userStates[userId];
            await ctx.editMessageText(boardMenu.text, boardMenu.keyboard);
        }
        await ctx.answerCbQuery();
    })

    bot.action('cancel', (ctx) => {
        delete userStates[ctx.from.id];
        ctx.reply("Has cancelado la acción.");
        ctx.deleteMessage();

    });


    bot.action('send', async (ctx) => {
        const userId = ctx.from.id
        const state = userStates[userId]


        if (!state || state.step !== 'waiting_confirmation') {
            return ctx.answerCbQuery("Error: La sesión expiró o ya fue publicada.");
        }

        try {

            const { board, content } = state
            console.log(`Mensaje: "${content}" publicado en /${board}/`)
            await ctx.editMessageText("Post enviado con éxito.")
            delete userStates[userId]
        } catch (error) {
            console.log("Error: ", error)
        }


    })

    bot.on('text', async (ctx, next) => {
        const userId = ctx.from.id
        const state = userStates[userId]

        if (!state || state.step != 'waiting_text') {
            return next()
        }

        if (!ctx.message.text) {
            return ctx.reply("Por favor, solo texto.")
        }
        if (ctx.message.text.startsWith('/')) {
            delete userStates[ctx.from.id];
            return next(); // Deja que el comando se ejecute normalmente
        }

        if (state.menuMessageId) {
            await ctx.telegram.deleteMessage(ctx.chat.id, state.menuMessageId).catch(() => { });
        }

        const postContent = ctx.message.text
        const board = state.board

        userStates[userId] = {
            ...state,
            step: 'waiting_confirmation',
            board: board,
            content: postContent
        };

        ctx.reply(`Tu post para publicar en /${board}/: \n\n${postContent}`, Markup.inlineKeyboard([
            [Markup.button.callback('Publicar', 'send')],
            [Markup.button.callback('Volver', 'back'),
            Markup.button.callback('Cancelar', 'cancel')
            ]
        ]))




    })
}