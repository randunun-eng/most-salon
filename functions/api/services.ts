import { getServices } from '../../lib/database';

export const onRequestGet: PagesFunction = async () => {
    try {
        const services = await getServices();
        return Response.json(services);
    } catch (error) {
        console.error('Error fetching services:', error);
        return Response.json(
            { error: 'Failed to fetch services' },
            { status: 500 }
        );
    }
};
