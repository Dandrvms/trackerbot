export async function deletePost(postId) {
    try {
        
        
        console.log("Recibiendo solicitud de eliminación del post:", { postId });
        

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
        console.log("Respuesta de API externa:", { status: response.status, body: responseText });

        if (response.status !== 200) {
            console.log("Error al eliminar el post:", responseText);
            return { error: "Error al eliminar el post." }
        }

        return { success: true, status: response.status }

    } catch (error) {
        console.error("Error en /api/delete:", error);
        return { error: "Error interno del servidor." }
    }
}