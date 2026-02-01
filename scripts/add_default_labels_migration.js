
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addDefaultLabelsToExistingBreweries() {
    console.log('Starting migration: Add default labels to existing breweries...');

    // 1. Get all breweries
    const { data: breweries, error: fetchError } = await supabase
        .from('breweries')
        .select('id, name');

    if (fetchError) {
        console.error('Error fetching breweries:', fetchError);
        process.exit(1);
    }

    console.log(`Found ${breweries.length} breweries.`);

    let addedCount = 0;
    let skippedCount = 0;

    for (const brewery of breweries) {
        // 2. Check if template already exists
        const { data: existingTemplates, error: checkError } = await supabase
            .from('label_templates')
            .select('id')
            .eq('brewery_id', brewery.id)
            .maybeSingle();

        if (checkError) {
            console.error(`Error checking templates for brewery ${brewery.name} (${brewery.id}):`, checkError);
            continue;
        }

        if (existingTemplates) {
            console.log(`Skipping ${brewery.name} (${brewery.id}): Template already exists.`);
            skippedCount++;
            continue;
        }

        // 3. Create default template
        const width = 57;
        const height = 105;
        const formatId = '6137'; // 57x105 Portrait

        const defaultDesign = {
            name: 'Standard Design (Portrait)',
            breweryId: brewery.id,
            formatId,
            orientation: 'p',
            width,
            height,
            background: { type: 'image', value: '/labels/label_105x57.png' },
            elements: [
                {
                    id: crypto.randomUUID(),
                    type: 'shape',
                    x: 0, y: 0, width, height, rotation: 0, zIndex: 0,
                    content: '',
                    style: { backgroundColor: '#ffffff', color: '#000000' },
                    isLocked: false, isCanvasLocked: true, isDeletable: false, isVariable: false, name: 'Background Color'
                },
                {
                    id: crypto.randomUUID(),
                    type: 'image',
                    x: 0, y: 0, width, height, rotation: 0, zIndex: 1,
                    content: '/labels/label_105x57.png',
                    style: { color: '#000000' },
                    isLocked: false, isCanvasLocked: true, isDeletable: false, isVariable: false, name: 'Background Image'
                },
                {
                    id: crypto.randomUUID(),
                    type: 'brand-logo',
                    x: 13, y: 5, width: 30, height: 8, rotation: 0, zIndex: 2,
                    content: '',
                    style: { color: '#000000', textAlign: 'center' },
                    isLocked: false, isCanvasLocked: false, isDeletable: true, isVariable: true, name: 'brand-logo'
                },
                {
                    id: crypto.randomUUID(),
                    type: 'qr-code',
                    x: 11, y: 14, width: 35, height: 35, rotation: 0, zIndex: 3,
                    content: '{{qr_code}}',
                    style: { color: '#000000', textAlign: 'left' },
                    isLocked: false, isCanvasLocked: false, isDeletable: true, isVariable: true, name: 'qr-code'
                },
                {
                    id: crypto.randomUUID(),
                    type: 'brand-footer',
                    x: 5, y: 93, width: 47, height: 7, rotation: 0, zIndex: 4,
                    content: 'BotlLab | Digital Brew Lab\nbotllab.de',
                    style: { fontFamily: 'Helvetica', fontSize: 6, fontWeight: 'bold', color: '#666666', textAlign: 'center' },
                    isLocked: false, isCanvasLocked: false, isDeletable: true, isVariable: false, name: 'brand-footer'
                }
            ]
        };

        const { error: insertError } = await supabase
            .from('label_templates')
            .insert({
                brewery_id: brewery.id,
                name: defaultDesign.name,
                format_id: formatId,
                config: defaultDesign, // supabase-js handles JSON serialization
                is_default: true
            });

        if (insertError) {
            console.error(`Error creating template for ${brewery.name}:`, insertError);
        } else {
            console.log(`Added default template for ${brewery.name} (${brewery.id})`);
            addedCount++;
        }
    }

    console.log(`Migration complete. Added: ${addedCount}, Skipped: ${skippedCount}.`);
}

addDefaultLabelsToExistingBreweries();
