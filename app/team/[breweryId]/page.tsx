import { redirect } from 'next/navigation';

export default function TeamIndex({ params }: { params: { breweryId: string } }) {
    redirect(`/team/${params.breweryId}/brews`);
}