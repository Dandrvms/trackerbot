import { safeEditMessageText, clearUserState, getCachedPin } from "@/app/utils/utils";
import { Markup } from 'telegraf';
import { userStates } from '@/app/utils/consts';



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
    userStates[userId] = {
        menuMessageId: sentMsg.message_id
    }

    // const sentMsg = await ctx.reply("Obteniendo posts...");
    // userStates[userId] = {
    //     step: 'getting_posts',
    //     menuMessageId: sentMsg.message_id
    // };
    // await getPosts(ctx);
}

export function handleScan(bot) {

    const safeAnswer = async (ctx) => {
        try { await ctx.answerCbQuery() } catch (e) { console.log("Query expirada") }
    }

    bot.action(/^get_(.*)$/, async (ctx) => {
        console.log("Ahoa")
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

    bot.action(/^view_detail_(\d+)$/, async (ctx) => {
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
        await getPosts(ctx, page)
        safeAnswer(ctx)
    })
}


export async function getPosts(ctx, page = 0) {
    const userId = ctx.from.id;
    let state = userStates[userId];
    const boardId = state.boardId


    if (!state.Posts) {

        const response = await fetch(`${process.env.URL}/api/get/allposts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ boardId })
        });

        if (response.status != 200) {
            return ctx.telegram.editMessageText(ctx.chat.id, state.menuMessageId, null, "Error al obtener posts.");
        }

        state.Posts = await response.json();
        // console.log("aqui", state.Posts)
    }

    const POSTS_PER_PAGE = 10

    const posts = state.Posts;
    const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);

    const start = page * POSTS_PER_PAGE;
    const end = start + POSTS_PER_PAGE;
    const paginatedItems = posts.slice(start, end);

    let replyText = `<b>Tablón ${state.boardId} (${page + 1}/${totalPages}):</b>\n\n`;


    const buttons = [];

    paginatedItems.forEach((msg, index) => {
        // const globalIndex = start + index + 1;

        // const cleanContent = msg.content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        // const url = `${process.env.BOARDS_URL}${msg.boardId}#${msg.id}`;

        // replyText += `${globalIndex}. <a href="${url}">Ver Post #${msg.id}</a>\n`;
        // replyText += `<i>${cleanContent.substring(0, 100)}${cleanContent.length > 100 ? '...' : ''}</i>\n\n`;


        const snippet = msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : '')
        buttons.push([Markup.button.callback(`${snippet}`, `view_detail_${msg.id}`)])
    });


    const navRow = [];

    if (page > 0) navRow.push(Markup.button.callback('⬅ Anterior', `back_page_${page - 1}`));
    if (page < totalPages - 1) navRow.push(Markup.button.callback('Siguiente ➡', `front_page_${page + 1}`));

    if (navRow.length > 0) buttons.push(navRow);
    buttons.push([Markup.button.callback('Cerrar', 'cancel')]);

    await safeEditMessageText(ctx, state.menuMessageId, replyText, Markup.inlineKeyboard(buttons));


    userStates[userId] = { ...state, currentPage: page };
}


export async function viewPostDetail(ctx, postId) {
    const userId = ctx.from.id;
    const state = userStates[userId];


    const post = state.Posts.find(p => p.id == postId);

    if (!post) return ctx.answerCbQuery("Post no encontrado.");

    const url = `${process.env.BOARDS_URL}${post.boardId}#${post.id}`;
    let detailText = `<b>Post #${post.id}</b> en`;
    detailText += `<code>/${post.boardId}/</code>\n\n`;
    detailText += `${post.content.slice(0, 1000).replace(/</g, "&lt;").replace(/>/g, "&gt;")} ${post.content.length > 1000 ? ' (...)' : ''}`;
    detailText += `\n\n<a href="${url}">Ver en la web</a>`;

    const buttons = Markup.inlineKeyboard([
        // [Markup.button.callback('🗑 Eliminar Post', `confirm_delete_${post.id}`),
        // Markup.button.callback('🖊 Editar Post', `edit_post_${post.id}`)
        // ],
        [Markup.button.callback('⬅ Volver a la lista', `back_list`)]
    ]);

    await safeEditMessageText(ctx, state.menuMessageId, detailText, buttons);
}