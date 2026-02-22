
import { D1Database } from '../../../lib/db-types';
import { getServices } from '../../../lib/database';

export const onRequestGet: PagesFunction = async (context) => {
    const db = context.env.DB as D1Database;
    try {
        const services = await getServices(db);
        return Response.json(services);
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to fetch services' }), { status: 500 });
    }
};

export const onRequestPost: PagesFunction = async (context) => {
    try {
        const { action, service } = await context.request.json() as any;
        const db = context.env.DB as D1Database;

        if (action === 'create') {
            const id = `service-${Date.now()}`;
            await db.prepare(
                'INSERT INTO services (id, name, duration_minutes, price, created_at) VALUES (?, ?, ?, ?, datetime("now"))'
            ).bind(id, service.name, service.duration_minutes, service.price).run();
            return Response.json({ success: true, id });
        }

        if (action === 'update') {
            await db.prepare(
                'UPDATE services SET name = ?, duration_minutes = ?, price = ? WHERE id = ?'
            ).bind(service.name, service.duration_minutes, service.price, service.id).run();
            return Response.json({ success: true });
        }

        if (action === 'delete') {
            await db.prepare('DELETE FROM services WHERE id = ?').bind(service.id).run();
            return Response.json({ success: true });
        }

        return new Response('Invalid action', { status: 400 });

    } catch (error) {
        return new Response(JSON.stringify({ error: 'Service action failed' }), { status: 500 });
    }
};
