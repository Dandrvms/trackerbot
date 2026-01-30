import { NextResponse } from "next/server";

export async function POST(req, res) {
    try {
        const request = await req.json();
        const { postId } = request;
        
        console.log("Recibiendo solicitud de eliminación del post:", { postId });
        
        if (!postId) {
            console.log("Faltan parámetros:", request);
            return NextResponse.json({ error: "Faltan parámetros obligatorios." }, { status: 400 });
        }
   

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
            return NextResponse.json({ error: "Error al eliminar el post." }, { status: response.status });
        }

        return NextResponse.json({ success: true, status: response.status });

    } catch (error) {
        console.error("Error en /api/delete:", error);
        return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
    }
}