//notificar de un post en un tablón

import { prisma } from "@/libs/prisma"
import { NextResponse } from "next/server";
import bot from "@/app/bot";
import { Markup } from "telegraf";

export async function POST(req, res) {


    const token = req.headers.get('Authorization')?.split(' ')[1]
    if (token !== process.env.WEB_TOKEN) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }


    const request = await req.json();
    console.log("Request: ", request)
    const { content , id, boardId } = request;

    if (!id || !content || !boardId) {
        console.log(request)
        return NextResponse.json({ error: "Faltan parámetros obligatorios." }, { status: 400 });
    }

    const users = await prisma.users.findMany({
        where: {
            board: {
                some: {
                    name: boardId
                }
            }
        }
    })
    const message = `Nuevo post en */${boardId}/*:\n\n${content.slice(0, 1000)} ${content.length > 1000 ? '(...)' : ''}`
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.url('Ver post', `${process.env.BOARDS_URL}${boardId}#${id}`)],
        [Markup.button.callback('Seguir', `track_${id}`),
        Markup.button.callback('Resp.', `reply_post_${id}_${boardId}`)
        ]
    ]);
    if(users){
        users.forEach(user => {
            bot.telegram.sendMessage(user.chat_id, message, { parse_mode : "Markdown", disable_web_page_preview: true, reply_markup: keyboard.reply_markup });
        })
    }

    return NextResponse.json({ success: true });
}