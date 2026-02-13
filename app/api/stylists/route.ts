// API Route: Get all stylists
import { NextResponse } from 'next/server';
import { getStylists } from '@/lib/database';

export { runtime } from '../runtime';

export async function GET() {
    try {
        const stylists = await getStylists(true);
        return NextResponse.json(stylists);
    } catch (error) {
        console.error('Error fetching stylists:', error);
        return NextResponse.json(
            { error: 'Failed to fetch stylists' },
            { status: 500 }
        );
    }
}
