//postear en un tablón desde el bot
import { Markup } from "telegraf";
import { apiPost, clearUserState, userStates } from "@/app/utils/utils";



export default async (ctx) => {
    ctx.deleteMessage().catch(() => { });
    await ctx.reply(boardMenu.text, boardMenu.keyboard);
}



const boardMenu = {
    text: "Escoge el tablón en el que quieres publicar:",
    keyboard: Markup.inlineKeyboard([
        [Markup.button.callback('/webo/', 'post:webo'),
        Markup.button.callback('/meta/', 'post:meta')],

        [Markup.button.callback('cancelar', 'cancel')]
    ])
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
        menuMessageId: message_id
    };
    await ctx.answerCbQuery();
})
}