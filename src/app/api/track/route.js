//notificar de un post en un tablón

import { prisma } from "@/libs/prisma"
import { NextResponse } from "next/server";
import bot from "@/app/back/bot";
export async function POST(req, res) {
    const request = await req.json();
    const { id, content, postId, boardId } = request;

    if (!id || !content || !postId || !boardId) {
        console.log(request)
        return NextResponse.json({ error: "Faltan parámetros obligatorios." }, { status: 400 });
    }

    const users = await prisma.users.findMany({
        where: {
            tracking: {
                some: {
                    postId: postId
                }
            }
        }
    })
    const message = `Nuevo respuesta en el post ${postId}:\n\nwbn N. ${id}\n\n${content}\n\n[Responder ↗](${process.env.WEB_URL}${boardId}/${postId}/comments)`
    if(users){
        users.forEach(user => {
            bot.telegram.sendMessage(user.chat_id, message, { parse_mode: "Markdown", disable_web_page_preview: true });
        })
    }

    return NextResponse.json({ success: true });
}