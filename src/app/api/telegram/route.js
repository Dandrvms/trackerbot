//hook para recibir los mensajes de telegram

import bot from "@/app/bot";

export async function POST(req) {
  try {
    const body = await req.json();
    await bot.handleUpdate(body); 
    return new Response("OK", { status: 200 }); 
  } catch (error) {
    console.error("Error procesando la actualización:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}