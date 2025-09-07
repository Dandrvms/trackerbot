import { prisma } from "@/libs/prisma"
import { NextResponse } from "next/server";
import bot from "@/app/back/bot";
export async function POST(req, res) {
    const request = await req.json();
    const { id, content, boardId } = request;

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
    const message = `Nuevo post en /${boardId}/:\n\nwbn Th. ${id}\n\n${content}\n\n[Ver post ↗](${process.env.WEB_URL}${boardId}#${id})`
    if(users){
        users.forEach(user => {
            bot.telegram.sendMessage(user.chat_id, message, { parse_mode: "Markdown", disable_web_page_preview: true });
        })
    }

    return NextResponse.json({ success: true });
}