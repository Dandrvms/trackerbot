//notificar de un comentario a un post específico

import { prisma } from "@/libs/prisma"
import { NextResponse } from "next/server";
import bot from "@/app/back/bot";
import { Markup } from "telegraf";

export async function POST(req, res) {
    const token = req.headers.get('Authorization')?.split(' ')[1]
    if (token !== process.env.WEB_TOKEN) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const request = await req.json();
    const { id, content, postId, boardId } = request;
    if (!id || !content || !postId || !boardId) {
        console.log(request)
        return NextResponse.json({ error: "Faltan parámetros obligatorios." }, { status: 400 });
    }

    const users = await prisma.users.findMany({
        where: {
            OR: [
                {
                    tracking: {
                        some: {
                            postId: postId
                        }
                    }
                },
                {
                    trackall: true
                }
            ]
        }

    })

    console.log(users)

    const postContent = await prisma.trackings.findFirst({
        where: {
            postId: postId
        },
        select: {
            content: true
        }
    })
    const message = `Nueva respuesta en el post ${postId} "${postContent ? postContent.content : ''}"\n\nwbn N. ${id}\n\n${content.slice(0, 1000)} ${content.length > 1000 ? '(...)' : ''}`
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.url('Ver post', `${process.env.BOARDS_URL}${boardId}/${postId}/comments`),
        Markup.button.callback('Resp.', `reply_comment_${postId}_${boardId}`)
        ]
    ]);
    if (users) {
        users.forEach(user => {
            bot.telegram.sendMessage(user.chat_id, message, { parse_mode: "Markdown", disable_web_page_preview: true, reply_markup: keyboard.reply_markup });
        })
    }

    return NextResponse.json({ success: true });
}