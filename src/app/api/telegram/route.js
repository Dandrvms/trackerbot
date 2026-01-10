//hook para recibir los mensajes de telegram

import bot from "@/app/back/bot";

export async function POST(req) {
  try {
    const body = await req.json(); // Parsear el cuerpo de la solicitud
    await bot.handleUpdate(body); // Procesar la actualización con Telegraf
    return new Response("OK", { status: 200 }); // Responder a Telegram
  } catch (error) {
    console.error("Error procesando la actualización:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}