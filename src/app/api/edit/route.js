import { NextResponse } from "next/server";

export async function POST(req, res) {
    try {
        const request = await req.json();
        const { content, postId } = request;
        
        console.log("Recibiendo solicitud de edición:", { content, postId });
        
        if (!content || !postId) {
            console.log("Faltan parámetros:", request);
            return NextResponse.json({ error: "Faltan parámetros obligatorios." }, { status: 400 });
        }

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
            return NextResponse.json({ error: "Error al editar el post." }, { status: response.status });
        }

        return NextResponse.json({ success: true, status: response.status });

    } catch (error) {
        console.error("Error en /api/edit:", error);
        return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
    }
}