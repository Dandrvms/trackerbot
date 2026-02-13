import { safeEditMessageText, clearUserState, getCachedPin } from "@/app/utils/utils";
import { Markup } from 'telegraf';
import { getUserState, updateUserState } from "../utils/userStates";
import { replaceMenu, getMenu } from "../utils/menus";
import { getMyPosts } from "@/app/external/getMyPosts";
import { getMyPostsForState, setMyPostsForState, getUniquePost } from "@/app/utils/managePosts"
import { edit } from "@/app/external/edit"
import { deletePost } from "@/app/external/delete";
import { act } from "react";
export default async (ctx) => {

    const userId = String(ctx.from.id);
    // const state = userStates[userId]
    ctx.deleteMessage().catch(() => { });
    const isCached = await getCachedPin(userId)
    if (!!isCached) {
        const sentMsg = await ctx.reply("Obteniendo posts...");

        const userState = await updateUserState(userId, { step: 'getting_posts' })
        await replaceMenu(userState.id, sentMsg.message_id, { type: 'message' })


        // userStates[userId] = {
        //     ...state,
        //     step: 'getting_posts',
        //     menuMessageId: sentMsg.message_id
        // };


        await getPosts(ctx);
    } else {
        const sentMsg = await ctx.reply("Escribe el PIN que enviaste cuando publicaste tus posts.", keyboard);


        const userState = await updateUserState(userId, { step: 'myposts_waiting_pin' })
        await replaceMenu(userState.id, sentMsg.message_id, { type: 'cancel_menu' })


        // userStates[userId] = {
        //     ...state,
        //     step: 'myposts_waiting_pin',
        //     menuMessageId: sentMsg.message_id
        // };
    }
}


export function handleNavigation(bot) {

    const safeAnswer = async (ctx) => {
        try { await ctx.answerCbQuery() } catch (e) { console.log("Query expirada") }
    }

    bot.action(/^view_post_(\d+)$/, async (ctx) => {
        const postId = ctx.match[1]
        await viewPostDetail(ctx, postId)
        safeAnswer(ctx)
    })

    bot.action('back_to_list', async (ctx) => {
        // const state = userStates[ctx.from.id]
        const state = await getUserState(ctx.from.id.toString())
        const menu = await getMenu(state.id)
        if (!menu) {
            await ctx.answerCbQuery("La sesión expiró. Por favor, usa /myposts de nuevo.");
            return;
        }

        const page = menu.currentPage || 0
        // const page = state?.currentPage || 0
        await getPosts(ctx, page)
        safeAnswer(ctx)
    })

    bot.action(/^(prev_page_|next_page_)(\d+)$/, async (ctx) => {
        const page = parseInt(ctx.match[2])
        await getPosts(ctx, page)
        safeAnswer(ctx)
    })

    bot.action(/^confirm_delete_(\d+)$/, async (ctx) => {
        const postId = ctx.match[1]
        await DeletePost(ctx, postId)
        safeAnswer(ctx)
    })


    bot.action(/^edit_post_(\d+)$/, async (ctx) => {
        const postId = ctx.match[1]
        await EditPost(ctx, postId)
        safeAnswer(ctx)
    })

    bot.action('save', async (ctx) => {
        console.log("Guardando cambios...");
        const userId = String(ctx.from.id);

        const state = await getUserState(userId)
        const menu = await getMenu(state.id)
        // const state = userStates[userId];

        if (!menu) {
            return ctx.answerCbQuery("Sesión expirada. Por favor, comienza de nuevo.");
        }

        await updateUserState(userId, { step: 'waiting_pin_edit' })

        // userStates[userId] = {
        //     ...state,
        //     step: 'waiting_pin_edit'
        // };

        await editMyPost(ctx);
    })


    bot.action('delete', async (ctx) => {
        const userId = String(ctx.from.id);
        // const state = userStates[userId];
        const state = await getUserState(userId)
        const menu = await getMenu(state.id)

        if (!menu) {
            return ctx.answerCbQuery("Sesión expirada. Por favor, comienza de nuevo.");
        }

        await updateUserState(userId, { step: 'waiting_pin_delete' })

        // userStates[userId] = {
        //     ...state,
        //     step: 'waiting_pin_delete'
        // };

        await deleteMyPost(ctx);
    })
}


async function EditPost(ctx, postId) {
    const userId = String(ctx.from.id)
    // const state = userStates[userId]
    const state = await getUserState(userId)
    const menu = await getMenu(state.id)
    if (!menu) {
        // await ctx.answerCbQuery("La sesión expiró. Por favor, usa /myposts de nuevo.");
        return;
    }
    // const post = state.myPosts.find(p => p.id == postId);
    const post = await getUniquePost(postId)
    if (post === null) return
    const cleanPost = post.preview.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    let message = `\`${cleanPost.substring(0, 1000)}${cleanPost.length > 1000 ? '...' : ''}\``;
    message += "\n\nEnvíame la nueva versión del post";
    await ctx.telegram.deleteMessage(ctx.chat.id, menu.messageId).catch(() => { });

    const response = await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard.reply_markup
    });

    const userState = await updateUserState(userId, { step: 'editing_text', postId: Number(postId) })
    await replaceMenu(userState.id, response.message_id, { type: 'cancel_menu' })

 
    // userStates[ctx.from.id] = {
    //     ...state,
    //     step: "editing_text",
    //     menuMessageId: response.message_id,
    //     postId: postId
    // }
}

async function DeletePost(ctx, postId) {
    const userId = String(ctx.from.id)
    // const state = userStates[userId]
    const state = await getUserState(userId)
    const menu = await getMenu(state.id)
    if (!menu) {
        // await ctx.answerCbQuery("La sesión expiró. Por favor, usa /myposts de nuevo.");
        return;
    }

    await ctx.telegram.deleteMessage(ctx.chat.id, state.menuMessageId).catch(() => { });
    const hasPin = await getCachedPin(userId)
    await safeEditMessageText(ctx, menu.messageId, "Confirma que quieres eliminar el post", Markup.inlineKeyboard([
        [
            hasPin
                ? Markup.button.callback('Eliminar', 'delete')
                : Markup.button.callback('PIN 🔑 y eliminar', 'pin_delete')
        ],
        [
            Markup.button.callback('Cancelar', 'cancel')
        ]
    ]), ctx.from.id)

    // userStates[ctx.from.id] = {
    //     ...state,
    //     step: "deleting_text",
    //     menuMessageId: response.message_id,
    //     postId: postId
    // }
    await updateUserState(userId, { step: 'deleting_text', postId: Number(postId) })
    await replaceMenu(state.id, menu.messageId, { type: 'confirmation_menu' })
}


export const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('Cancelar', 'cancel')]
]);


const POSTS_PER_PAGE = 5;

export async function getPosts(ctx, page = 0) {
    const userId = String(ctx.from.id);
    // let state = userStates[userId];
    const state = await getUserState(userId)
    let myposts = await getMyPostsForState(state.id)
    const menu = await getMenu(state.id)
    if (myposts.length === 0) {
        const pin = await getCachedPin(userId)
        if (!pin)
            if (ctx.updateType === 'callback_query') {
                return ctx.answerCbQuery("Sesión expirada");
            } else {
                const response = await ctx.reply("Sesión expirada...", keyboard);
                // userStates[ctx.from.id] = {
                //     ...state,
                //     step: 'myposts_waiting_pin',
                //     menuMessageId: response.message_id
                // };

                const userState = await updateUserState(userId, { step: 'myposts_waiting_pin' })

                await replaceMenu(userState.id, response.message_id, { type: 'cancel_menu' })

                return response
            }
        console.log("Consultando api externa")
        const { messages, error } = await getMyPosts(userId.toString(), pin)


        if (error) {
            return ctx.telegram.editMessageText(ctx.chat.id, menu.messageId, null, "Error al obtener posts.");
        }
        await setMyPostsForState(state.id, messages)

        myposts = await getMyPostsForState(state.id)

     
    }



    const messages = myposts
    const totalPages = Math.ceil(messages.length / POSTS_PER_PAGE);

    const start = page * POSTS_PER_PAGE;
    const end = start + POSTS_PER_PAGE;
    const paginatedItems = messages.slice(start, end);

    let replyText = `<b>Tus posts publicados (${page + 1}/${totalPages}):</b>\n\n`;


    const buttons = [];

    paginatedItems.forEach((msg, index) => {
        // const globalIndex = start + index + 1;

        // const cleanContent = msg.content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        // const url = `${process.env.BOARDS_URL}${msg.boardId}#${msg.id}`;

        // replyText += `${globalIndex}. <a href="${url}">Ver Post #${msg.id}</a>\n`;
        // replyText += `<i>${cleanContent.substring(0, 100)}${cleanContent.length > 100 ? '...' : ''}</i>\n\n`;


        const snippet = msg.preview.substring(0, 25) + (msg.preview.length > 25 ? '...' : '')
        buttons.push([Markup.button.callback(`${snippet}`, `view_post_${msg.externalId}`)])
    });


    const navRow = [];

    if (page > 0) navRow.push(Markup.button.callback('⬅ Anterior', `prev_page_${page - 1}`));
    if (page < totalPages - 1) navRow.push(Markup.button.callback('Siguiente ➡', `next_page_${page + 1}`));

    if (navRow.length > 0) buttons.push(navRow);
    buttons.push([Markup.button.callback('Cerrar', 'cancel')]);

    await safeEditMessageText(ctx, menu.messageId, replyText, Markup.inlineKeyboard(buttons));
    await replaceMenu(state.id, menu.messageId, { type: 'myposts_list', currentPage: page })


    // userStates[userId] = { ...state, currentPage: page };
}


export async function viewPostDetail(ctx, postId) {
    const userId = String(ctx.from.id);
    // const state = userStates[userId];
    const state = await getUserState(userId)
    const posts = await getMyPostsForState(state.id)
    const menu = await getMenu(state.id)


    const post = posts.find(p => p.externalId == postId);

    if (!post) return ctx.answerCbQuery("Post no encontrado.");

    const url = `${process.env.BOARDS_URL}${post.boardId}#${post.externalId}`;
    let detailText = `<b>Post #${post.externalId}</b> en`;
    detailText += `<code>/${post.boardId}/</code>\n\n`;
    detailText += `${post.preview.replace(/</g, "&lt;").replace(/>/g, "&gt;")}`;
    detailText += `\n\n<a href="${url}">Ver en la web</a>`;

    const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('🗑 Eliminar Post', `confirm_delete_${post.externalId}`),
        Markup.button.callback('🖊 Editar Post', `edit_post_${post.externalId}`)
        ],
        [Markup.button.callback('⬅ Volver a la lista', `back_to_list`)]
    ]);

    await safeEditMessageText(ctx, menu.messageId, detailText, buttons);
}

export async function editMyPost(ctx) {
    console.log("api edit")
    const userId = String(ctx.from.id)
    // const state = userStates[userId]
    const state = await getUserState(userId)
    const menu = await getMenu(state.id)
    const postId = state.postId
    const pin = await getCachedPin(userId)

    if (!pin) {
        return ctx.answerCbQuery("Sesión expirada. Ingresa tu PIN nuevamente.")
    }

    if (!state || state.step !== 'waiting_pin_edit') {
        return ctx.answerCbQuery("Error: Sesión no válida.");
    }

    if (!state.content) {
        return ctx.answerCbQuery("Error: No hay contenido para editar.");
    }

    try {

        const { content } = state

        const { error, success } = await edit(content, postId, state.id)

        if (success) {
            console.log("Post editado exitosamente");
            await ctx.telegram.editMessageText(
                ctx.chat.id,
                menu.messageId,
                null,
                "Post editado exitosamente."
            );
            // clearUserState(userId)
        } else {
            console.log("Error en la API al guardar: ", error);
            await ctx.telegram.editMessageText(
                ctx.chat.id,
                menu.messageId,
                null,
                "Error al editar el post. Inténtalo más tarde."
            );
        }
    } catch (error) {
        console.log("Error en apiEdit:", error);
        await ctx.telegram.editMessageText(
            ctx.chat.id,
            menu.messageId,
            null,
            "Error interno al editar el post."
        );
    }
}

export async function deleteMyPost(ctx) {
    console.log("api delete")
    const userId = String(ctx.from.id)
    // const state = userStates[userId]
    const state = await getUserState(userId)
    const menu = await getMenu(state.id)
    const postId = state.postId
    const pin = await getCachedPin(userId)

    if (!pin) {
        return ctx.answerCbQuery("Sesión expirada. Ingresa tu PIN nuevamente.")
    }

    if (!state || state.step !== 'waiting_pin_delete') {
        return ctx.answerCbQuery("Error: Sesión no válida.");
    }

    try {

        // const { menuMessageId } = state

        const { error, success } = await deletePost(postId, state.id)


        if (success) {
            console.log("Post eliminado exitosamente");
            await ctx.telegram.editMessageText(
                ctx.chat.id,
                menu.messageId,
                null,
                "Post eliminado exitosamente."
            );
            // clearUserState(userId)
        } else {
            console.log("Error en la API al borrar: ", error);
            await ctx.telegram.editMessageText(
                ctx.chat.id,
                menu.messageId,
                null,
                "Error al eliminar el post. Inténtalo más tarde."
            );
        }
    } catch (error) {
        console.log("Error en apiDelete:", error);
        await ctx.telegram.editMessageText(
            ctx.chat.id,
            menu.messageId,
            null,
            "Error interno al eliminar el post."
        );
    }

}