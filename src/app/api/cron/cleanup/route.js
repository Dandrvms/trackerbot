import { prisma } from '@/libs/prisma';
import { NextResponse } from 'next/server';

export async function GET(request) {
   
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('No autorizado', { status: 401 });
    }

    const minutes15ago = new Date(Date.now() - 15 * 60 * 1000)

    try {
 

        const [sessions, states] = await prisma.$transaction([
            prisma.userSession.deleteMany({
                where: {
                    expires: { lt: new Date() }
                }
            }),
            prisma.user_States.deleteMany({
                where: {
                    createdAt: { lt: minutes15ago }
                }
            })
        ]);

        const deletedCount = sessions.count + states.count

        return NextResponse.json({ 
            success: true, 
            deletedCount: deletedCount,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error en el cron de limpieza:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}