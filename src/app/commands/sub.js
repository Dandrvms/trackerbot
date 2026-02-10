import { prisma } from "@/libs/prisma"

const boards = ["webo", "meta", "polls"]


export default async (ctx) => {
    const chat_id = ctx.chat.id
    const text = ctx.message.text.split(" ")
    if (text.length < 2) {
        ctx.reply("Uso correcto: \n\n/sub <nombre_del_tablón>")
        return
    }

    const board = text[1].toLowerCase()

    if (!boards.includes(board)) {
        ctx.reply("Tablón no válido. Los tablones disponibles son: \n- " + boards.join("\n- "));
        return;
    }else{
        const user = await prisma.users.findFirst({
            where: {
                chat_id: String(chat_id)
            },
            include: {
                board: true
            }
        })

        if(user){
            if(user.board.map(b => b.name).includes(board)){
                ctx.reply(`Ya estabas suscrito al tablón /${board}.`)
            }else{
                await prisma.boards.create({
                    data: {
                        name: board,
                        userId: user.id
                    }
                })
                ctx.reply(`Te has suscrito al tablón /${board}.`)
            }
        }else{
            await prisma.users.create({
                data:{
                    chat_id: String(chat_id),
                    board: {
                        create: {
                            name: board
                        }
                    }
                }
            })
        }
    }

    console.log(text)
}