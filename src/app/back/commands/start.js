import { prisma } from "@/libs/prisma"

export default async (ctx) => {
    ctx.reply("Bienvenido al bot oficial de Webochan. \n\nEscribe /help para obtener información sobre los comandos o bien inicia la miniapp en el botón de menú.")
    const userId = ctx.chat.id.toString();
    // Verificar si el usuario ya está registrado en la base de datos
    const user = await prisma.users.findFirst({
        where: { chat_id: userId }
    });
    if (!user) {
        // Si el usuario no está registrado, crear uno nuevo
        await prisma.users.create({
            data: { chat_id: userId }
        });
        
    }
    
}