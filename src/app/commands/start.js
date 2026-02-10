import { prisma } from "@/libs/prisma"

export default async (ctx) => {
  
    ctx.reply("Bienvenido al bot oficial de Webochan. \n\nEscribe /help para obtener información sobre los comandos o bien inicia la miniapp en el botón de menú.")
    const userId = ctx.chat.id.toString();
    const user = await prisma.users.findFirst({
        where: { chat_id: userId }
    });
    if (!user) {
        await prisma.users.create({
            data: { chat_id: userId }
        });
        
    }
    
}