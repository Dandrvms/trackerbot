import { prisma } from "@/libs/prisma"

export async function deletePost(postId, userStateId) {
    try {


        


        const response = await fetch(`${process.env.WEB_URL}/api/bot/delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.WEB_TOKEN}`,
                'Origin': process.env.URL
            },
            body: JSON.stringify({
                postId: postId,
            })
        });

        const responseText = await response.text();

        if (response.status !== 200) {
            return { error: "Error al eliminar el post." }
        }

        await prisma.managePosts.delete({
            where: {
                externalId_userStateId: { 
                    externalId: String(postId),
                    userStateId: userStateId
                }
            }
        })

        return { success: true, status: response.status }

    } catch (error) {
        console.error("Error en /api/delete:", error);
        return { error: "Error interno del servidor." }
    }
}