import { safeEditMessageText, clearUserState, getCachedPin } from "@/app/utils/utils";
import { Markup } from 'telegraf';
// import { userStates } from '@/app/utils/consts';
import { getAllPosts } from "@/app/external/getAllPosts";
import { getUserState, updateUserState } from "../utils/userStates";
import { replaceMenu, getMenu } from "../utils/menus";
import { createScanSession, storeScanData, getScanPosts, getScanPostDetail, } from "../utils/scanSession";



const keyboard = Markup.inlineKeyboard([
    [
        Markup.button.callback('/webo/', 'get_webo'),
        Markup.button.callback('/meta/', 'get_meta'),

    ],
    // [Markup.button.callback('/test/', 'get_test')],
    [Markup.button.callback('Cancelar', 'cancel')]
]);

export default async (ctx) => {
    const userId = String(ctx.from.id);
    ctx.deleteMessage().catch(() => { });

    const sentMsg = await ctx.reply("¿Qué tablón quieres navegar?", keyboard)
    // const state = userStates[userId]
    // userStates[userId] = {
    //     ...state,
    //     menuMessageId: sentMsg.message_id
    // }
    
    const state = await updateUserState(userId, { step: 'selecting_board' })
    await replaceMenu(state.id, sentMsg.message_id, { type: 'dialog_menu' })
}

export function handleScan(bot) {

    const safeAnswer = async (ctx) => {
        try { await ctx.answerCbQuery() } catch (e) { console.log("Query expirada:", e) }
    }

    bot.action(/^get_(.*)$/, async (ctx) => {
        const boardId = ctx.match[1]
        const userId = String(ctx.from.id)
        const state = await getUserState(userId)
        const menu = await getMenu(state.id)
        if (!state) {
            await ctx.reply('Error: Sesión inválida.')
            return
        }
        await updateUserState(userId, { boardId: boardId })
        // const state = userStates[userId]
        // userStates[userId] = {
        //     ...state,
        //     boardId: boardId
        // }
        await safeEditMessageText(ctx, menu.messageId, "Obteniendo posts...")
        await getPosts(ctx)
    })


    bot.action(/^(back_page_|front_page_)(\d+)$/, async (ctx) => {
        const page = parseInt(ctx.match[2])
        await getPosts(ctx, page)
        safeAnswer(ctx)
    })

    bot.action(/^(back_c_page_|front_c_page_)(\d+)$/, async (ctx) => {
        const page = parseInt(ctx.match[2])
        await getComments(ctx, page)
        safeAnswer(ctx)
    })

    bot.action(/^view_detail_(\d+)$/, async (ctx) => {
        const postId = ctx.match[1]
        await viewPostDetail(ctx, postId)
        safeAnswer(ctx)
    })

    bot.action(/^view_c_detail_(\d+)$/, async (ctx) => {
        const commentId = ctx.match[1]
        await viewCommentDetail(ctx, commentId)
        safeAnswer(ctx)
    })

    bot.action(/^view_comments_(\d+)$/, async (ctx) => {
        const postId = ctx.match[1]
        const state = await updateUserState(String(ctx.from.id), { postId: Number(postId) })
        // const state = userStates[ctx.from.id]
        // userStates[ctx.from.id] = {
        //     ...state,
        //     postId: postId
        // }
        await getComments(ctx)
        safeAnswer(ctx)
    })

    bot.action(/^back_to_post_(\d+)$/, async (ctx) => {
        const postId = ctx.match[1]
        await viewPostDetail(ctx, postId)
        safeAnswer(ctx)
    })

    bot.action('back_list', async (ctx) => {
        // const state = userStates[ctx.from.id]
        const state = await getUserState(String(ctx.from.id))
        const menu = await getMenu(state.id)
        if (!state) {
            await ctx.answerCbQuery("La sesión expiró. Por favor, usa /myposts de nuevo.");
            return;
        }

        if (state.step === 'viewing_comment_detail') {
            await updateUserState(String(ctx.from.id), { commentContent: null, commentId: null })
        }

        const page = menu?.currentPage || 0
        if (state.step === 'viewing_post') await getPosts(ctx, page)
        else if (state.step === 'viewing_comment_detail') await getComments(ctx, page)
        safeAnswer(ctx)
    })
}


export async function getComments(ctx, page = 0) {
    const userId = String(ctx.from.id)
    // let state = userStates[userId]
    const state = await getUserState(userId)
    const postId = state.postId

    if (!state.scanSession.id || !state.postId) return

    const post = await getScanPostDetail(
        state.scanSession.id,
        postId
    )
    if (!post) {
        return ctx.reply("Post no encontrado.")
    }

    console.log("POST:",post)


    // const comments = state.Posts.find(p => p.id == postId).comments
    // const content = state.Posts.find(p => p.id == postId).content
    // userStates[userId] = {
    //     ...state,
    //     step: "viewing_comments",
    //     content: content
    // }
    await updateUserState(userId, { step: 'viewing_comments', content: post.preview })

    await renderList(ctx, post.comments, page)
}


export async function getPosts(ctx, page = 0) {
    const userId = String(ctx.from.id);
    // let state = userStates[userId];
    const state = await getUserState(userId)
    const boardId = state.boardId
    const menu = await getMenu(state.id)
    let sessionId = state?.scanSession?.id


    if (!sessionId) {

        const { error, posts } = await getAllPosts(boardId)

        if (error) {
            return ctx.telegram.editMessageText(ctx.chat.id, menu.messageId, null, "Error al obtener posts.");
        }

        const session = await createScanSession(state.id)
        await storeScanData(session.id, posts)
        sessionId = session.id


    }

    let scanPosts = await getScanPosts(sessionId, boardId)

    if (scanPosts.length === 0) {
        const { error, posts } = await getAllPosts(boardId)
        if (error) {
            return ctx.telegram.editMessageText(ctx.chat.id, menu.messageId, null, "Error al obtener posts.");
        }
        await storeScanData(sessionId, posts)
        scanPosts = await getScanPosts(sessionId, boardId)
    }

    await updateUserState(userId, { step: 'viewing_list' })
    // userStates[userId] = {
    //     ...state,
    //     step: 'viewing_list'
    // }

    await renderList(ctx, scanPosts, page)

}


async function renderList(ctx, posts, page) {
    // let state = userStates[ctx.from.id]
    const state = await getUserState(ctx.from.id.toString())
    const menu = await getMenu(state.id)

    const POSTS_PER_PAGE = 10

    const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);

    const start = page * POSTS_PER_PAGE;
    const end = start + POSTS_PER_PAGE;
    const paginatedItems = posts.slice(start, end);
    let replyText
    let detail
    let next
    let back
    if (state.step === 'viewing_list') {
        detail = 'view_detail'
        next = 'front_page'
        back = 'back_page'
        replyText = `<b>Tablón ${state.boardId} (${page + 1}/${totalPages}):</b>\n\n`;
    } else if (state.step === 'viewing_comments') {
        detail = 'view_c_detail'
        next = 'front_c_page'
        back = 'back_c_page'
        replyText = `<b>comentarios del post ${state.postId}: '${state.content.slice(0, 100)}' (${page + 1}/${totalPages}):</b>\n\n`;
    }




    const buttons = [];

    paginatedItems.forEach((msg, index) => {


        const snippet = msg.externalId + '. ' + msg.preview.substring(0, 50) + (msg.preview.length > 50 ? '...' : '')
        buttons.push([Markup.button.callback(`${snippet}`, `${detail}_${msg.externalId}`)])
    });


    const navRow = [];

    if (page > 0) navRow.push(Markup.button.callback('⬅ Anterior', `${back}_${page - 1}`));
    if (page < totalPages - 1) navRow.push(Markup.button.callback('Siguiente ➡', `${next}_${page + 1}`));

    if (navRow.length > 0) buttons.push(navRow);

    if (state.step === 'viewing_comments') {
        buttons.push([Markup.button.callback('Volver', `back_to_post_${state.postId}`)]);
    }

    buttons.push([Markup.button.callback('Cerrar', 'cancel')]);

    console.log("MENU:",menu)
    console.log("REPLY TEXT:", replyText)

    await safeEditMessageText(ctx, menu.messageId, replyText, Markup.inlineKeyboard(buttons));


    // userStates[ctx.from.id] = { ...state, currentPage: page };
    replaceMenu(state.id, menu.messageId, { currentPage: page, type: 'post_menu' })
}


export async function viewPostDetail(ctx, postId) {
    const userId = String(ctx.from.id);
    // const state = userStates[userId];

    // userStates[userId] = {
    //     ...state,
    //     step: 'viewing_post'
    // }
    const state = await updateUserState(userId, { step: 'viewing_post', postId: Number(postId) })
    const menu = await getMenu(state.id)
    const boardId = state.boardId
    const post = await getScanPostDetail(state.scanSession.id, postId)
    await updateUserState(userId, { content: post.preview })




    if (!post) return ctx.answerCbQuery("Post no encontrado.");

    const url = `${process.env.BOARDS_URL}${boardId}#${post.externalId}`;
    let detailText = `<b>Post #${post.externalId}</b> en`;
    detailText += `<code>/${state.boardId}/</code>\n\n`;
    detailText += `${post.preview.slice(0, 1000).replace(/</g, "&lt;").replace(/>/g, "&gt;")} ${post.preview.length > 1000 ? ' (...)' : ''}`;
    detailText += `\n\n<a href="${url}">Ver en la web</a>`;

    const buttons = Markup.inlineKeyboard([
        [Markup.button.callback(`Ver comentarios (${post.comments.length})`, `view_comments_${post.externalId}`)],
        [Markup.button.callback('Seguir', `track_${post.externalId}`)],
        [Markup.button.callback('Resp.', `reply_post_${post.externalId}_${post.boardId}`)],
        [Markup.button.callback('⬅ Volver a la lista', `back_list`)]
    ]);

    await safeEditMessageText(ctx, menu.messageId, detailText, buttons);
}


export async function viewCommentDetail(ctx, commentId) {

    const userId = String(ctx.from.id);
    // const state = userStates[userId];
    const state = await updateUserState(userId, { step: 'viewing_comment_detail', commentId: Number(commentId) })
    const menu = await getMenu(state.id)
    const postId = state.postId
    const boardId = state.boardId
    const comment = (await getScanPostDetail(state.scanSession.id, postId)).comments?.find(c => c.externalId == commentId)
    await updateUserState(userId, { commentContent: comment.preview })
    // userStates[userId] = {
    //     ...state,
    //     step: 'viewing_comment_detail'
    // }

    // const comment = state.Posts.find(p => p.id == postId)?.comments?.find(c => c.id == commentId);

    if (!comment) return ctx.answerCbQuery("Comentario no encontrado.");

    const url = `${process.env.BOARDS_URL}${state.boardId}/${postId}/comments`;
    let detailText = `<b>Comentario #${commentId}</b> en `;
    detailText += `'${state.content.slice(0,100)}'\n\n`;
    detailText += `${comment.preview.slice(0, 1000).replace(/</g, "&lt;").replace(/>/g, "&gt;")} ${comment.preview.length > 1000 ? ' (...)' : ''}`;
    detailText += `\n\n<a href="${url}">Ver en la web</a>`;

    const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('Resp', `reply_comment_${commentId}_${boardId}`)],
        [Markup.button.callback('⬅ Volver a la lista', `back_list`)]
    ]);

    await safeEditMessageText(ctx, menu.messageId, detailText, buttons);
}