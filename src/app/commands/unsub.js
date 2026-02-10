import { prisma } from "@/libs/prisma"

const boards = ["webo", "meta", "polls"]

export default async (ctx) => {
    const chatId = String(ctx.chat.id)

    const text = ctx.message.text.split(" ")
    if (text.length < 2) {
        ctx.reply("Uso correcto: \n\n/unsub <nombre_del_tablón>")
        return
    }

    const board = text[1].toLowerCase()
    if (!boards.includes(board)) {
        ctx.reply("Tablón no válido. Los tablones disponibles son: \n- " + boards.join("\n- "))
        return
    }

    const user = await prisma.users.findFirst({
        where: {
            chat_id: chatId
        },
        include: {
            board: true
        }
    })

    if (user) {
        if (user.board.map(b => b.name).includes(board)) {
            await prisma.boards.delete({
                where: {
                    name: board,
                    user_id: user.id
                }
            })
            ctx.reply(`Te has desuscrito del tablón ${board}.`)
        }else{
            ctx.reply(`No estás suscrito al tablón ${board}.`)
        }
    }else{
        ctx.reply("No estás suscrito a ningún tablón.")
    }
}