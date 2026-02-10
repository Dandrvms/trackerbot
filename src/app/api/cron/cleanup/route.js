import { prisma } from '@/libs/prisma';
import { NextResponse } from 'next/server';

export async function GET(request) {
   
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('No autorizado', { status: 401 });
    }

    try {
        const deleted = await prisma.userSession.deleteMany({
            where: {
                expires: {
                    lt: new Date(), 
                },
            },
        });

        return NextResponse.json({ 
            success: true, 
            deletedCount: deleted.count,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error en el cron de limpieza:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}