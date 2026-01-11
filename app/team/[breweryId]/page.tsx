import { redirect } from 'next/navigation';

export default async function TeamIndex({ params }: { params: Promise<{ breweryId: string }> }) {
    const { breweryId } = await params;
    redirect('/team/' + breweryId + '/dashboard');
}
