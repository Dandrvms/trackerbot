import crypto from 'crypto';
import { getPosts } from "@/app/commands/myposts"
import { Markup } from 'telegraf';
import { sendPost } from '@/app/commands/post'
import { editMyPost, deleteMyPost } from '@/app/commands/myposts'
import { sendComment} from '@/app/utils/notifyUtils'
import { prisma } from '@/libs/prisma'
import { getUserState, updateUserState } from "../utils/userStates";
import { replaceMenu, getMenu } from "../utils/menus";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; 
const IV_LENGTH = 16;

export function encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text) {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}


export async function cacheUserPin(chatId, pin) {
    const encryptedPin = encrypt(pin); 
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    await prisma.userSession.upsert({
        where: { userId: chatId.toString() },
        update: { pin: encryptedPin, expires: expiry },
        create: { userId: chatId.toString(), pin: encryptedPin, expires: expiry },
    });
}

export async function getCachedPin(chatId) {
    const session = await prisma.userSession.findUnique({
        where: { userId: chatId.toString() }
    });

    if (!session || new Date() > session.expires) {
        if (session) await prisma.userSession.delete({ where: { userId: chatId.toString() } });
        return null;
    }

    return decrypt(session.pin);
}


export function generateSalt() {
    return crypto.randomBytes(16).toString('hex');
}

export function deriveSecretKey(pin, salt) {
    const iterations = 100000
    const keylength = 16
    const digest = 'sha256'
    return crypto.pbkdf2Sync(pin, salt, iterations, keylength, digest).toString('hex');
}



// export function clearUserState(userId) {
//     delete userStates[userId];
// }




// export function cacheUserPin(chatId, pin) {
//     cache.set(chatId, pin);

//     setTimeout(() => {
//         cache.delete(chatId);
//         console.log(`Pin eliminado para chat ${chatId}`);
//     }, 15 * 60 * 1000);
// }


export async function safeEditMessageText(ctx, messageId, text, keyboard = null, chatId = null) {
    try {
        const targetChatId = chatId || ctx.chat?.id || ctx.from?.id;
        if (!messageId) {
           console.log("No messageId proporcionado para safeEditMessageText");

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

    bot.action(/^pin_(.*)/, async (ctx) => {
        const action = ctx.match[1]
        const userId = String(ctx.from.id)
        // const state = userStates[userId]
        const state = await getUserState(userId)

        if (!state) {
            await ctx.answerCbQuery("Sesión expirada.")
            return
        }

        const messageId = ctx.callbackQuery.message.message_id;

        await ctx.editMessageText("Envía el pin que asociaste a este post", Markup.inlineKeyboard([
            [Markup.button.callback('Cancelar', 'cancel')]
        ]))

        let step = action === 'edit' ? 'waiting_pin_edit' : action === 'delete' ? 'waiting_pin_delete' : ''
     
        // userStates[userId] = {
        //     ...state,
        //     step: step,
        //     menuMessageId: messageId
        // };

        await updateUserState(userId, { step: step })
        await replaceMenu(state.id, messageId, { type: 'cancel_menu' })
        await ctx.answerCbQuery();
    })


    bot.on('text', async (ctx, next) => {
        const userId = String(ctx.from.id)
        // const state = userStates[userId]
        const state = await getUserState(userId)


        if (!state || ctx.message.text.startsWith('/')) {
            return next()
        }
        
        switch (state.step) {
            case 'waiting_text': case 'editing_text': case 'waiting_text_comment':
                await handleTextInput(ctx, state);
                break;
            case 'waiting_pin': case 'waiting_pin_comment':
                await handlePinInput(ctx, state);
                break;
            case 'myposts_waiting_pin':
                await handlePinInput(ctx, state);
                break;
            case 'waiting_pin_edit': case 'waiting_pin_delete':
                await handlePinInput(ctx, state)
                break
            default:
                return next();
        }

    });


}


async function handleTextInput(ctx, state) {
    const userId = String(ctx.from.id)
    const postContent = ctx.message.text
    const boardId = state.boardId
    const postId = state.postId
    const menu = await getMenu(state.id)
    await ctx.deleteMessage().catch(() => { })
    if (menu.messageId) {
        await ctx.telegram.deleteMessage(ctx.chat.id, menu.messageId).catch(() => { });
    }

    let sentMsg

    if (state.step === 'waiting_text') {
        sentMsg = await ctx.reply(`Tu post para publicar en /${boardId}/: \n\n${postContent}`, await getConfirmationMenu(userId))
    } else if (state.step === 'editing_text') {
        sentMsg = await ctx.reply(`Nueva versión del post: \n\n${postContent}`, await getConfirmationEditMenu(userId))
    } else if (state.step === 'waiting_text_comment') {
        sentMsg = await ctx.reply(`Tu comentario para responder al post ${postId}:\n\n${postContent}`, await getConfirmationCommentMenu(userId))
    }
    // userStates[userId] = {
    //     ...state,
    //     step: 'waiting_confirmation',
    //     content: postContent,
    //     menuMessageId: sentMsg.message_id
    // };

    await updateUserState(userId, { 
        step: 'waiting_confirmation',
        content: postContent
    })
    await replaceMenu(state.id, sentMsg.message_id, { type: 'cancel_menu' })
}

async function handlePinInput(ctx, state) {
    const userId = String(ctx.from.id)
    const pin = ctx.message.text
    const menu = await getMenu(state.id)



    await ctx.deleteMessage().catch(() => { })
    if (!/^\d{6}$/.test(pin)) {

        await safeEditMessageText(
            ctx,
            menu.messageId,
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
            menu.messageId,
            "Verificando PIN y publicando..."
        );

        await cacheUserPin(userId.toString(), pin);
        await sendPost(ctx)
    } else if (state.step === 'myposts_waiting_pin') {

        await safeEditMessageText(
            ctx,
            menu.messageId,
            "Verificando PIN y obteniendo tus posts..."
        );
        await cacheUserPin(userId.toString(), pin);
        await getPosts(ctx)
    } else if (state.step === 'waiting_pin_edit') {
        await safeEditMessageText(
            ctx,
            menu.messageId,
            "Verificando PIN y editando..."
        )
        await cacheUserPin(userId.toString(), pin)
        await editMyPost(ctx)
    } else if (state.step === 'waiting_pin_delete') {
        await safeEditMessageText(
            ctx,
            menu.messageId,
            "Verificando PIN y borrando..."
        )
        await cacheUserPin(userId.toString(), pin)
        await deleteMyPost(ctx)
    } else if (state.step === 'waiting_pin_comment') {
        await safeEditMessageText(
            ctx,
            menu.messageId,
            "Verificando PIN y respondiendo..."
        )
        await cacheUserPin(userId.toString(), pin)
        await sendComment(ctx)
    }
}

// export function isCached(ctx) {
//     const userId = String(ctx.from.id)
//     return cache.has(userId.toString())
// }



export const getConfirmationMenu = async (userId) => {
    const hasPin = await getCachedPin(userId)
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

export const getConfirmationCommentMenu = async (userId) => {
    const hasPin = await getCachedPin(userId)
    return Markup.inlineKeyboard([
        [
            hasPin
                ? Markup.button.callback('Enviar ahora', 'reply')
                : Markup.button.callback('🔑 Ingresar PIN y Enviar', 'comment_pin')
        ],
        [
            Markup.button.callback('Cancelar', 'cancel')
        ]
    ]);
};


const getConfirmationEditMenu = async (userId) => {
    const hasPin = await getCachedPin(userId)
    return Markup.inlineKeyboard([
        [
            hasPin
                ? Markup.button.callback('Guardar cambios', 'save')
                : Markup.button.callback('🔑 Ingresar PIN y Guardar Cambios', 'pin_edit')
        ],
        [
            Markup.button.callback('Cancelar', 'cancel')
        ]
    ]);
};