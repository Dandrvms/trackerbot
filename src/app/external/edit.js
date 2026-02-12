import { prisma } from "@/libs/prisma"
import { makePreview } from "../utils/managePosts";

export async function edit(content, postId, userStateId) {
    try {


        console.log("Recibiendo solicitud de edición:", { content, postId });


        console.log(`Enviando modificaciones para post ${postId}: ${content.substring(0, 50)}...`);

        const response = await fetch(`${process.env.WEB_URL}/api/bot/edit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.WEB_TOKEN}`,
                'Origin': process.env.URL
            },
            body: JSON.stringify({
                content: content,
                postId: postId,
            })
        });

        const responseText = await response.text();
        console.log("Respuesta de API externa:", { status: response.status, body: responseText });

        if (response.status !== 200) {
            console.log("Error al enviar el post:", responseText);
            return { error: "Error al editar el post." }
        }

        await prisma.managePosts.update({
            where: {
                externalId_userStateId: { 
                    externalId: String(postId),
                    userStateId: userStateId
                }
            },
            data: {
                preview: makePreview(content)
            }
        })

        return { success: true }

    } catch (error) {
        console.error("Error en /api/edit:", error);
        return { error: "Error interno del servidor." }
    }
}