import { getStylists } from '../../lib/database';

export const onRequestGet: PagesFunction = async () => {
    try {
        const stylists = await getStylists(true);
        return Response.json(stylists);
    } catch (error) {
        console.error('Error fetching stylists:', error);
        return Response.json(
            { error: 'Failed to fetch stylists' },
            { status: 500 }
        );
    }
};
