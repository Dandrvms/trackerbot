import { safeEditMessageText, clearUserState, getCachedPin } from "@/app/utils/utils";
import { Markup } from 'telegraf';
import { userStates } from '@/app/utils/consts';
import { getAllPosts } from "@/app/external/getAllPosts";



const keyboard = Markup.inlineKeyboard([
    [
        Markup.button.callback('/webo/', 'get_webo'),
        Markup.button.callback('/meta/', 'get_meta')
    ],
    [Markup.button.callback('Cancelar', 'cancel')]
]);

export default async (ctx) => {
    const userId = ctx.from.id;
    ctx.deleteMessage().catch(() => { });
    
    const sentMsg = await ctx.reply("¿Qué tablón quieres navegar?", keyboard)
    const state = userStates[userId]
    userStates[userId] = {
        ...state,
        menuMessageId: sentMsg.message_id
    }
}

export function handleScan(bot) {

    const safeAnswer = async (ctx) => {
        try { await ctx.answerCbQuery() } catch (e) { console.log("Query expirada") }
    }

    bot.action(/^get_(.*)$/, async (ctx) => {
        const boardId = ctx.match[1]
        const userId = ctx.from.id
        const state = userStates[userId]
        userStates[userId] = {
            ...state,
            boardId: boardId
        }
        await safeEditMessageText(ctx, state.menuMessageId, "Obteniendo posts...")
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
        console.log("c1:",commentId)
        await viewCommentDetail(ctx, commentId)
        safeAnswer(ctx)
    })

    bot.action(/^view_comments_(\d+)$/, async (ctx) => {
        const postId = ctx.match[1]
        const state = userStates[ctx.from.id]
        userStates[ctx.from.id] = {
            ...state,
            postId: postId
        }
        await getComments(ctx)
        safeAnswer(ctx)
    })

    bot.action(/^back_to_post_(\d+)$/, async (ctx) => {
        const postId = ctx.match[1]
        await viewPostDetail(ctx, postId)
        safeAnswer(ctx)
    })

    bot.action('back_list', async (ctx) => {
        const state = userStates[ctx.from.id]
        if (!state) {
            await ctx.answerCbQuery("La sesión expiró. Por favor, usa /myposts de nuevo.");
            return;
        }
        const page = state?.currentPage || 0
        if (state.step === 'viewing_post') await getPosts(ctx, page)
        else if (state.step === 'viewing_comment_detail') await getComments(ctx, page)
        safeAnswer(ctx)
    })
}


async function getComments(ctx, page = 0) {
    const userId = ctx.from.id
    let state = userStates[userId]
    const postId = state.postId

    const comments = state.Posts.find(p => p.id == postId).comments
    const content = state.Posts.find(p => p.id == postId).content
    userStates[userId] = {
        ...state,
        step: "viewing_comments",
        content: content
    }

    await renderList(ctx, comments, page)
}


export async function getPosts(ctx, page = 0) {
    const userId = ctx.from.id;
    let state = userStates[userId];
    const boardId = state.boardId


    if (!state.Posts) {

        const { error, posts } = await getAllPosts(boardId)

        if (error) {
            return ctx.telegram.editMessageText(ctx.chat.id, state.menuMessageId, null, "Error al obtener posts.");
        }

        state.Posts = posts

    }

    userStates[userId] = {
        ...state,
        step: 'viewing_list'
    }

    await renderList(ctx, state.Posts, page)

}


async function renderList(ctx, posts, page) {
    let state = userStates[ctx.from.id]

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
        replyText = `<b>comentarios del post ${state.postId}: '${state.content}' (${page + 1}/${totalPages}):</b>\n\n`;
    }




    const buttons = [];

    paginatedItems.forEach((msg, index) => {


        const snippet = msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : '')
        buttons.push([Markup.button.callback(`${snippet}`, `${detail}_${msg.id}`)])
    });


    const navRow = [];

    if (page > 0) navRow.push(Markup.button.callback('⬅ Anterior', `${back}_${page - 1}`));
    if (page < totalPages - 1) navRow.push(Markup.button.callback('Siguiente ➡', `${next}_${page + 1}`));

    if (navRow.length > 0) buttons.push(navRow);

    if (state.step === 'viewing_comments') {
        buttons.push([Markup.button.callback('Volver', `back_to_post_${state.postId}`)]);
    }

    buttons.push([Markup.button.callback('Cerrar', 'cancel')]);

    await safeEditMessageText(ctx, state.menuMessageId, replyText, Markup.inlineKeyboard(buttons));

    
    userStates[ctx.from.id] = { ...state, currentPage: page };
}


export async function viewPostDetail(ctx, postId) {
    const userId = ctx.from.id;
    const state = userStates[userId];

    userStates[userId] = {
        ...state,
        step: 'viewing_post'
    }


    const post = state.Posts.find(p => p.id == postId);

    if (!post) return ctx.answerCbQuery("Post no encontrado.");

    const url = `${process.env.BOARDS_URL}${post.boardId}#${post.id}`;
    let detailText = `<b>Post #${post.id}</b> en`;
    detailText += `<code>/${post.boardId}/</code>\n\n`;
    detailText += `${post.content.slice(0, 1000).replace(/</g, "&lt;").replace(/>/g, "&gt;")} ${post.content.length > 1000 ? ' (...)' : ''}`;
    detailText += `\n\n<a href="${url}">Ver en la web</a>`;

    const buttons = Markup.inlineKeyboard([
        [Markup.button.callback(`Ver comentarios (${post.comments.length})`, `view_comments_${post.id}`)],
        [Markup.button.callback('Seguir', `track_${post.id}`)],
        [Markup.button.callback('Resp.', `reply_post_${post.id}_${post.boardId}`)],
        [Markup.button.callback('⬅ Volver a la lista', `back_list`)]
    ]);

    await safeEditMessageText(ctx, state.menuMessageId, detailText, buttons);
}


export async function viewCommentDetail(ctx, commentId) {
    console.log("c2:",commentId)
    const userId = ctx.from.id;
    const state = userStates[userId];
    const postId = state.postId
    const boardId = state.boardId

    userStates[userId] = {
        ...state,
        step: 'viewing_comment_detail'
    }
    
    const comment = state.Posts.find(p => p.id == postId)?.comments?.find(c => c.id == commentId);

    if (!comment) return ctx.answerCbQuery("Comentario no encontrado.");

    const url = `${process.env.BOARDS_URL}${state.boardId}/${postId}/comments`;
    let detailText = `<b>Comentario #${commentId}</b> en `;
    detailText += `'${state.content}'\n\n`;
    detailText += `${comment.content.slice(0, 1000).replace(/</g, "&lt;").replace(/>/g, "&gt;")} ${comment.content.length > 1000 ? ' (...)' : ''}`;
    detailText += `\n\n<a href="${url}">Ver en la web</a>`;

    const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('Resp', `reply_comment_${postId}_${boardId}`)],
        [Markup.button.callback('⬅ Volver a la lista', `back_list`)]
    ]);

    await safeEditMessageText(ctx, state.menuMessageId, detailText, buttons);
}