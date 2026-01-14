import crypto from 'crypto';
import { Markup } from 'telegraf';

export function generateSalt() {
    return crypto.randomBytes(16).toString('hex');
}

export function deriveSecretKey(pin, salt) {
    const iterations = 100000
    const keylength = 16
    const digest = 'sha256'
    return crypto.pbkdf2Sync(pin, salt, iterations, keylength, digest).toString('hex');
}

export const userStates = {}

export function clearUserState(userId) {
    delete userStates[userId];
}


export const cache = new Map();

export function cacheUserPin(chatId, pin) {
    cache.set(chatId, pin);

    setTimeout(() => {
        cache.delete(chatId);
        console.log(`Pin eliminado para chat ${chatId}`);
    }, 15 * 60 * 1000);
}


export async function safeEditMessageText(ctx, messageId, text, keyboard = null, chatId = null) {
    try {
        const targetChatId = chatId || ctx.chat?.id || ctx.from?.id;
        if (!messageId) {
            throw new Error("No messageId proporcionado para safeEditMessageText");

        }

        const extra = {
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            ...(keyboard ? { reply_markup: keyboard.reply_markup } : {})
        };


        await ctx.telegram.editMessageText(
            targetChatId,
            messageId,
            null,
            text,
            extra
        );



    } catch (error) {

        if (error.response &&
            error.response.error_code === 400 &&
            error.response.description.includes('message is not modified')) {
            console.log('Mensaje no modificado, ignorando error.');
            return;
        }
        throw error;
    }
}


export function handleInput(bot) {

   
    bot.action(/^(prev_page_|next_page_)(\d+)$/, async (ctx) => {
        const page = parseInt(ctx.match[2]);
        await getPosts(ctx, page);
        await ctx.answerCbQuery();
    });


    bot.on('text', async (ctx, next) => {
        const userId = ctx.from.id
        const state = userStates[userId]


        if (!state || ctx.message.text.startsWith('/')) {
            return next()
        }
        console.log("State step: ", state.step)
        switch (state.step) {
            case 'waiting_text':
                await handleTextInput(ctx, state);
                break;
            case 'waiting_pin':
                await handlePinInput(ctx, state);
                break;
            case 'myposts_waiting_pin':
                await handlePinInput(ctx, state);
                break;
            default:
                return next();
        }

    });
}


async function handleTextInput(ctx, state) {
    const userId = ctx.from.id
    const postContent = ctx.message.text
    const board = state.board

    await ctx.deleteMessage().catch(() => { })
    if (state.menuMessageId) {
        await ctx.telegram.deleteMessage(ctx.chat.id, state.menuMessageId).catch(() => { });
    }


    const sentMsg = await ctx.reply(`Tu post para publicar en /${board}/: \n\n${postContent}`, getConfirmationMenu(userId))

    userStates[userId] = {
        ...state,
        step: 'waiting_confirmation',
        content: postContent,
        menuMessageId: sentMsg.message_id
    };
}

async function handlePinInput(ctx, state) {
    const userId = ctx.from.id
    const pin = ctx.message.text

    await ctx.deleteMessage().catch(() => { })
    if (!/^\d{6}$/.test(pin)) {

        await safeEditMessageText(
            ctx,
            state.menuMessageId,
            `El PIN debe ser de 6 dígitos. Intenta de nuevo.`,
            Markup.inlineKeyboard([
                [Markup.button.callback('Cancelar', 'cancel')]
            ])
        );
        return

    }

    if (state.step === 'waiting_pin') {

        await safeEditMessageText(
            ctx,
            state.menuMessageId,
            "Verificando PIN y publicando..."
        );

        cacheUserPin(userId.toString(), pin);
        await apiPost(ctx)
    } else if (state.step === 'myposts_waiting_pin') {

        await safeEditMessageText(
            ctx,
            state.menuMessageId,
            "Verificando PIN y obteniendo tus posts..."
        );
        cacheUserPin(userId.toString(), pin);
        await getPosts(ctx)
    }
}


const POSTS_PER_PAGE = 5;

async function getPosts(ctx, page = 0) {
    const userId = ctx.from.id;
    let state = userStates[userId];


    if (!state.myPosts) {
        const pin = cache.get(userId.toString());
        if (!pin) return ctx.answerCbQuery("Sesión expirada. Ingresa tu PIN.");

        const response = await fetch(`${process.env.URL}/api/get/myposts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: userId.toString(), pin: pin })
        });

        if (response.status != 200) {
            return ctx.telegram.editMessageText(ctx.chat.id, state.menuMessageId, null, "Error al obtener posts.");
        }

        state.myPosts = await response.json();
    }

    const messages = state.myPosts;
    const totalPages = Math.ceil(messages.length / POSTS_PER_PAGE);

    if (messages.length === 0) {
        return safeEditMessageText(ctx, state.menuMessageId, "No tienes posts publicados.");
    }


    const start = page * POSTS_PER_PAGE;
    const end = start + POSTS_PER_PAGE;
    const paginatedItems = messages.slice(start, end);

    let replyText = `<b>Tus posts publicados (${page + 1}/${totalPages}):</b>\n\n`;

    paginatedItems.forEach((msg, index) => {
        const globalIndex = start + index + 1;

        const cleanContent = msg.content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const url = `${process.env.BOARDS_URL}${msg.boardId}#${msg.id}`;

        replyText += `${globalIndex}. <a href="${url}">Ver Post #${msg.id}</a>\n`;
        replyText += `<i>${cleanContent.substring(0, 100)}${cleanContent.length > 100 ? '...' : ''}</i>\n\n`;
    });

    const buttons = [];
    const navRow = [];

    if (page > 0) navRow.push(Markup.button.callback('⬅ Anterior', `prev_page_${page - 1}`));
    if (page < totalPages - 1) navRow.push(Markup.button.callback('Siguiente ➡', `next_page_${page + 1}`));

    if (navRow.length > 0) buttons.push(navRow);
    buttons.push([Markup.button.callback('Cerrar', 'cancel')]);

    await safeEditMessageText(ctx, state.menuMessageId, replyText, Markup.inlineKeyboard(buttons));


    userStates[userId] = { ...state, currentPage: page };
}

export async function apiPost(ctx) {
    const userId = ctx.from.id
    const state = userStates[userId]
    const pin = cache.get(userId.toString());

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

        const notif = await fetch(`${process.env.URL}/api/notify`, {
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

const getConfirmationMenu = (userId) => {
    const hasPin = cache.has(userId.toString());
    return Markup.inlineKeyboard([
        [
            hasPin
                ? Markup.button.callback('Publicar ahora', 'send')
                : Markup.button.callback('🔑 Ingresar PIN y Publicar', 'pin')
        ],
        [
            Markup.button.callback('Volver', 'back'),
            Markup.button.callback('Cancelar', 'cancel')
        ]
    ]);
};