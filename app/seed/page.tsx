'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';

export default function SeedPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<string>('idle');
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);

  const createStandaloneRecipe = async () => {
      if (!user) {
          setStatus('Error: Not logged in');
          return;
      }

      setStatus('Finding Brewery...');
      try {
          // 1. Find existing brewery
          const { data: members, error: mError } = await supabase
              .from('brewery_members')
              .select('brewery_id')
              .eq('user_id', user.id)
              .limit(1);
          
          if (mError) throw mError;
          if (!members || members.length === 0) {
              setStatus('Error: You need to join a brewery first.');
              return;
          }

          const breweryId = members[0].brewery_id;
          
          setStatus('Creating Recipe...');
          // 2. Create Rich Brew
          const { data: brew, error: brError } = await supabase
            .from('brews')
            .insert({
                brewery_id: breweryId,
                user_id: user.id,
                name: 'Golden Pale Ale (Seed)',
                style: 'Pale Ale',
                description: 'Ein automatisch generiertes Rezept mit vollen Daten.',
                image_url: 'https://images.unsplash.com/photo-1566633806327-68e152aaf26d?auto=format&fit=crop&w=800&q=80',
                is_public: true, 
                data: {
                    // Basics
                    batch_size_liters: 20,
                    og: 1.052,
                    fg: 1.010,
                    abv: 5.5,
                    ibu: 35,
                    color: 12,
                    efficiency: 75,
                    carbonation_g_l: 5.0,
                    
                    // Water & Mash
                    mash_water_liters: 18,
                    sparge_water_liters: 14,
                    mash_ph: 5.4,
                    
                    // Ingredients (Directly on data, not nested in ingredients)
                    malts: [
                        { name: 'Pale Ale Malt', amount: 5, unit: 'kg' },
                        { name: 'Caramel 20L', amount: 0.5, unit: 'kg' }
                    ],
                    mash_steps: [
                        { temp: 67, duration: 60, title: 'Kombirast' },
                        { temp: 78, duration: 10, title: 'Abmaischen' }
                    ],

                    // Boil & Hops
                    boil_time: 60,
                    hops: [
                        { name: 'Citra', amount: 25, unit: 'g', time: 60, usage: 'Boil' },
                        { name: 'Citra', amount: 25, unit: 'g', time: 5, usage: 'Aroma' },
                        { name: 'Mosaic', amount: 50, unit: 'g', time: 0, usage: 'Dry Hop' }
                    ],

                    // Fermentation
                    yeast: 'US-05 American Ale',
                    primary_temp: 19
                }
            })
            .select()
            .single();

           if (brError) throw brError;
           
           setStatus('Done! Redirecting...');
           setCreatedUrl(`/team/${breweryId}/brews/${brew.id}`);

      } catch(e: any) {
          console.error(e);
          setStatus('Error: ' + e.message);
      }
  };

  const runSeed = async () => {
    if (!user) {
        setStatus('Error: Not logged in');
        return;
    }

    setStatus('Creating Brewery...');
    try {
        // 1. Create Brewery
        const { data: brewery, error: bError } = await supabase
            .from('breweries')
            .insert({
                name: 'BotlLab Test Brewery',
                description: 'Generated for testing Sessions 2.0',
            })
            .select()
            .single();
        
        if (bError) throw bError;

        // 2. Add Member
        const { error: mError } = await supabase
            .from('brewery_members')
            .insert({
                brewery_id: brewery.id,
                user_id: user.id,
                role: 'admin'
            });
        
        if (mError) throw mError;

        setStatus('Creating Recipe...');
        // 3. Create Brew (Recipe)
        const { data: brew, error: brError } = await supabase
            .from('brews')
            .insert({
                brewery_id: brewery.id,
                user_id: user.id,
                name: 'Winter Kölsch 2.0',
                style: 'Kölsch',
                description: 'Ein komplettes Testrezept.',
                image_url: 'https://images.unsplash.com/photo-1571506165871-ee72a35bc3d4?auto=format&fit=crop&q=80',
                data: {
                    c_boil_time: 60,
                    c_mash_efficiency: 75,
                    batch_size: 20,
                    abv: 4.8,
                    original_gravity: 1.048,
                    ibu: 25,
                    ingredients: {
                        malts: [
                            { name: 'Pilsner Malz', amount: 4.5, unit: 'kg' },
                            { name: 'Weizenmalz', amount: 0.5, unit: 'kg' }
                        ],
                        hops: [
                            { name: 'Hallertauer Tradition', amount: 30, unit: 'g', time: 60, type: 'boil' },
                            { name: 'Tettnanger', amount: 20, unit: 'g', time: 10, type: 'aroma' }
                        ],
                        yeast: { name: 'K-97 German Ale', amount: 1, unit: 'pkg' }
                    },
                    mash_schedule: [
                        { temp: 63, duration: 45, step: 'Maltoserast' },
                        { temp: 72, duration: 20, step: 'Verzuckerung' },
                        { temp: 78, duration: 1, step: 'Abmaischen' }
                    ]
                }
            })
            .select()
            .single();

        if (brError) throw brError;

        setStatus('Creating Session & Timeline...');
        // 4. Create Session with Timeline
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 5); // Started 5 days ago

        const timeline = [
            {
                id: crypto.randomUUID(),
                type: 'NOTE',
                date: new Date(startDate.getTime()).toISOString(),
                createdAt: new Date(startDate.getTime()).toISOString(),
                title: 'Brautag geplant',
                description: 'Zutaten sind bestellt, Hefe ist frisch.',
                data: {}
            },
            {
                id: crypto.randomUUID(),
                type: 'INGREDIENT_ADD',
                date: new Date(startDate.getTime() + 3600000).toISOString(),
                createdAt: new Date(startDate.getTime() + 3600000).toISOString(),
                data: { name: 'Pilsner Malz', amount: 4500, unit: 'g', additionType: 'mash' }
            },
            {
                id: crypto.randomUUID(),
                type: 'MEASUREMENT_OG',
                date: new Date(startDate.getTime() + 14400000).toISOString(), // 4h later
                createdAt: new Date(startDate.getTime() + 14400000).toISOString(),
                data: { gravity: 1.048, unit: 'sg', temperature: 20 }
            },
            {
                id: crypto.randomUUID(),
                type: 'STATUS_CHANGE',
                date: new Date(startDate.getTime() + 15000000).toISOString(),
                createdAt: new Date(startDate.getTime() + 15000000).toISOString(),
                data: { newStatus: 'fermenting', previousStatus: 'brewing' }
            },
            {
                id: crypto.randomUUID(),
                type: 'MEASUREMENT_SG',
                date: new Date(startDate.getTime() + 172800000).toISOString(), // 2 days later
                createdAt: new Date(startDate.getTime() + 172800000).toISOString(),
                data: { gravity: 1.020, unit: 'sg', temperature: 19 }
            }
        ];

        const { data: session, error: sError } = await supabase
            .from('brewing_sessions')
            .insert({
                brewery_id: brewery.id,
                brew_id: brew.id,
                phase: 'fermenting',
                status: 'fermenting',
                batch_code: 'B-TEST-01',
                brewed_at: startDate,
                timeline: timeline,
                measurements: { og: 1.048 } // Legacy cache
            })
            .select()
            .single();

        if (sError) throw sError;

        setStatus('Done!');
        setCreatedUrl(`/team/${brewery.id}/sessions/${session.id}/logbook`);

    } catch (e: any) {
        console.error('Seed Error Object:', e);
        console.error('Seed Error Stringified:', JSON.stringify(e, null, 2));
        
        let msg = 'Unknown Error';
        if (e?.message) msg = e.message;
        if (e?.code) msg += ` (Code: ${e.code})`;
        if (e?.details) msg += ` - ${e.details}`;
        if (e?.hint) msg += ` [Hint: ${e.hint}]`;
        
        setStatus('Error: ' + msg);
    }
  };

  const createFullRecipe = async () => {
    if (!user) {
        setStatus('Error: Not logged in');
        return;
    }

    setStatus('Finding Brewery...');
    try {
        // 1. Find existing brewery (to avoid clutter) or create if none
        let breweryId;
        
        // Try to find first brewery where user is a member
        const { data: members, error: mCheckError } = await supabase
            .from('brewery_members')
            .select('brewery_id')
            .eq('user_id', user.id)
            .limit(1);
            
        if (!mCheckError && members && members.length > 0) {
            breweryId = members[0].brewery_id;
        } else {
            // Create new if none exists
            const { data: brewery, error: bError } = await supabase
                .from('breweries')
                .insert({
                    name: 'BotlLab Test Brewery',
                    description: 'Generated for Full Recipe Test',
                })
                .select()
                .single();
            
            if (bError) throw bError;
            breweryId = brewery.id;

            const { error: mError } = await supabase
                .from('brewery_members')
                .insert({
                    brewery_id: breweryId,
                    user_id: user.id,
                    role: 'admin'
                });
            if (mError) throw mError;
        }

        setStatus('Creating Full Recipe...');
        // 2. Create Full Brew (Recipe)
        const { data: brew, error: brError } = await supabase
            .from('brews')
            .insert({
                brewery_id: breweryId,
                user_id: user.id,
                name: 'Summer Ale 2026',
                brew_type: 'beer',
                style: 'Pale Ale',
                description: 'Ein leichtes Sommerbier für heiße Tage. Complete dataset test.',
                is_public: true,
                image_url: 'https://images.unsplash.com/photo-1566633806327-68e152aaf26d?auto=format&fit=crop&w=800&q=80',
                cap_url: '🍺',
                data: {
                    batch_size_liters: 20,
                    abv: 5.2,
                    ibu: 35,
                    og: 1.050,
                    fg: 1.010,
                    mash_water_liters: 15,
                    sparge_water_liters: 15,
                    boil_time: 60,
                    hops: [
                      { name: 'Citra', amount: 20, unit: 'g', time: 60, usage: 'Boil' },
                      { name: 'Mosaic', amount: 15, unit: 'g', time: 10, usage: 'Aroma' }
                    ],
                    malts: [
                      { name: 'Maris Otter', amount: 4, unit: 'kg' },
                      { name: 'Caramel 20', amount: 0.5, unit: 'kg' }
                    ],
                    yeast: 'US-05',
                    mash_steps: [
                      { name: 'Maischen', temperature: 67, duration: 60 },
                      { name: 'Läutern', temperature: 78, duration: 20 },
                      { name: 'Kochen', temperature: 100, duration: 60 }
                    ]
                }
            })
            .select()
            .single();

        if (brError) throw brError;

        setStatus('Done!');
        setCreatedUrl(`/b/${brew.id}`);

    } catch (e: any) {
        console.error('Full Recipe Seed Error:', e);
        setStatus('Error: ' + (e.message || 'Unknown error'));
    }
  };



  return (
    <div className="p-12 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Sessions 2.0 Seeder</h1>
      <p className="mb-4 text-gray-600">
        Stelle sicher, dass du eingeloggt bist. Tools zum Generieren von Testdaten.
      </p>
      
      {!user && (
          <div className="bg-red-100 text-red-800 p-4 rounded mb-4">
              Nicht eingeloggt! <Link href="/login" className="underline font-bold">Hier einloggen</Link>
          </div>
      )}

      <div className="space-y-4">
        <button
            onClick={runSeed}
            disabled={status !== 'idle' || !user}
            className="bg-amber-500 text-white font-bold py-3 px-6 rounded-lg w-full disabled:opacity-50 hover:bg-amber-600 transition-colors"
        >
            {status !== 'idle' && !status.includes('Full') && !status.includes('Standalone') ? status : '✨ Brauerei + Session erstellen'}
        </button>

        <button
            onClick={createFullRecipe}
            disabled={status !== 'idle' || !user}
            className="bg-blue-500 text-white font-bold py-3 px-6 rounded-lg w-full disabled:opacity-50 hover:bg-blue-600 transition-colors"
        >
            {status !== 'idle' && status.includes('Full') ? status : '🍺 Volles Rezept erstellen (Auto-Brewery)'}
        </button>

        <button
            onClick={createStandaloneRecipe}
            disabled={status !== 'idle' || !user}
            className="bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg w-full disabled:opacity-50 hover:bg-indigo-600 transition-colors"
        >
            {status !== 'idle' && status.includes('Standalone') ? status : '🍺 Volles Rezept erstellen (Standalone)'}
        </button>
      </div>

      {createdUrl && (
          <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
              <p className="text-green-800 font-bold mb-2">Erfolg!</p>
              <Link href={createdUrl} className="inline-block bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700">
                   Zum erstellten Eintrag
              </Link>
          </div>
      )}
    </div>
  );
}
