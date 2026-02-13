import { prisma } from "@/libs/prisma"
import { makePreview } from "../utils/managePosts";

export async function edit(content, postId, userStateId) {
    try {

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

        if (response.status !== 200) {
            return { error: "Error al editar el post." }
        }

        return { success: true }

    } catch (error) {
        console.error("Error en /api/edit:", error);
        return { error: "Error interno del servidor." }
    }
}