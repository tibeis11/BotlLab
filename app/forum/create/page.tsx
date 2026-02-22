import { getForumCategories } from '@/lib/forum-service';
import NewThreadForm from './NewThreadForm';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase'; // Use correct client for data fetch if needed, similar to forum-service

interface CreateThreadPageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CreateThreadPage({ searchParams }: CreateThreadPageProps) {
    // Await params first thing
    const resolvedParams = await searchParams;

    // Auth Check
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) { try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} }
            }
        }
    );
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login?next=/forum/create');
    }

    const categories = await getForumCategories();
    
    // Resolve search params
    const brewId = typeof resolvedParams.brewId === 'string' ? resolvedParams.brewId : undefined;
    const title = typeof resolvedParams.title === 'string' ? resolvedParams.title : undefined;
    // Support both categoryId (UUID) and categorySlug (slug) params — slug is preferred
    const categorySlug = typeof resolvedParams.categorySlug === 'string' ? resolvedParams.categorySlug : undefined;
    const categoryIdParam = typeof resolvedParams.categoryId === 'string' ? resolvedParams.categoryId : undefined;
    const categoryId = categoryIdParam ?? (categorySlug
        ? (categories as any[]).find((c: any) => c.slug === categorySlug)?.id
        : undefined);

    let linkedBrew = null;
    if (brewId) {
        // Use server client for data fetching to be safe/consistent, 
        // though public brews are readable by anon.
        // We reuse the supabase client created for auth check above if we want, 
        // but it's cleaner to reuse valid instances. 
        // Let's reuse the one from Auth check
        const { data } = await supabase.from('brews').select('id, name, image_url').eq('id', brewId).single();
        linkedBrew = data;
    }

    return (
        <div className="max-w-screen-2xl mx-auto px-6 md:px-12 lg:px-16 py-8">
            <NewThreadForm 
                categories={categories} 
                preselectedBrewId={brewId}
                initialTitle={title}
                initialCategoryId={categoryId}
                linkedBrew={linkedBrew}
            />
        </div>
    );
}
