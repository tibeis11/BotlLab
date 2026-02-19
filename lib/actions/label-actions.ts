
import { LabelDesign } from '@/lib/types/label-system';
import { LABEL_FORMATS } from '@/lib/smart-labels-config';
import { supabase } from '@/lib/supabase';

/**
 * Creates a default label template for a new brewery.
 * Dimensions: 57x105mm (Portrait)
 * Content:
 * 1. Brand Logo (x=13, y=5, w=30, h=8)
 * 2. QR Code (x=11, y=14, w=35, h=35)
 * 3. Brand Footer (x=5, y=93, w=47, h=7)
 * 4. Background Image (public/labels/label_105x57.png)
 */
export async function createDefaultBreweryTemplate(breweryId: string) {
    // Check if templates already exist (e.g. from database trigger)
    const { count, error: countError } = await supabase
        .from('label_templates')
        .select('*', { count: 'exact', head: true })
        .eq('brewery_id', breweryId);
    
    if (countError) {
        console.error('Error checking existing templates:', countError);
    }

    if (count && count > 0) {
        console.log(`Brewery ${breweryId} already has ${count} templates. Skipping default creation.`);
        return;
    }

    const width = 57;
    const height = 105;
    const formatId = '6137'; // Assuming 6137 is the 57x105 format

    const defaultDesign: Partial<LabelDesign> = {
        name: 'Standard Design (Portrait)',
        breweryId,
        formatId,
        orientation: 'p',
        width,
        height,
        background: { type: 'image', value: '/labels/label_105x57.png' },
        elements: [
            // Background Color (bottom-most)
            {
                id: crypto.randomUUID(),
                type: 'shape',
                x: 0,
                y: 0,
                width: width,
                height: height,
                rotation: 0,
                zIndex: 0,
                content: '',
                style: {
                    fontFamily: 'Helvetica',
                    fontSize: 0,
                    fontWeight: 'normal',
                    color: '#000000',
                    textAlign: 'left',
                    backgroundColor: '#ffffff'
                },
                isLocked: false,
                isCanvasLocked: true,
                isDeletable: false,
                isVariable: false,
                name: 'Background Color'
            },
            // Background Image
            {
                id: crypto.randomUUID(),
                type: 'image',
                x: 0,
                y: 0,
                width: width,
                height: height,
                rotation: 0,
                zIndex: 1,
                content: '/labels/label_105x57.png',
                style: {
                    fontFamily: 'Helvetica',
                    fontSize: 0,
                    fontWeight: 'normal',
                    color: '#000000',
                    textAlign: 'left'
                },
                isLocked: false,
                isCanvasLocked: true,
                isDeletable: false,
                isVariable: false,
                name: 'Background Image'
            },
            // 1: Brand-Logo
            {
                id: crypto.randomUUID(),
                type: 'brand-logo',
                x: 13,
                y: 5,
                width: 30,
                height: 8,
                rotation: 0,
                zIndex: 2,
                content: '',
                style: {
                    fontFamily: 'Helvetica',
                    fontSize: 0,
                    fontWeight: 'normal',
                    color: '#000000',
                    textAlign: 'center'
                },
                isLocked: false,
                isCanvasLocked: false,
                isDeletable: true,
                isVariable: true,
                name: 'brand-logo'
            },
            // 2: QR-Code
            {
                id: crypto.randomUUID(),
                type: 'qr-code',
                x: 11,
                y: 14,
                width: 35,
                height: 35,
                rotation: 0,
                zIndex: 3,
                content: '{{qr_code}}',
                style: {
                    fontFamily: 'Helvetica',
                    fontSize: 0,
                    fontWeight: 'normal',
                    color: '#000000',
                    textAlign: 'left'
                },
                isLocked: false,
                isCanvasLocked: false,
                isDeletable: true,
                isVariable: true,
                name: 'qr-code'
            },
            // 3: Brand-Footer
            {
                id: crypto.randomUUID(),
                type: 'brand-footer',
                x: 5,
                y: 93,
                width: 47,
                height: 7,
                rotation: 0,
                zIndex: 4,
                content: 'BotlLab | Digital Brew Lab\nbotllab.de',
                style: {
                    fontFamily: 'Helvetica',
                    fontSize: 6,
                    fontWeight: 'bold',
                    color: '#666666',
                    textAlign: 'center'
                },
                isLocked: false,
                isCanvasLocked: false,
                isDeletable: true,
                isVariable: false,
                name: 'brand-footer'
            }
        ]
    };

    const { error } = await supabase
        .from('label_templates')
        .insert({
            brewery_id: breweryId,
            name: defaultDesign.name,
            format_id: defaultDesign.formatId,
            config: defaultDesign,
            is_default: true
        });

    if (error) {
        console.error('Fehler beim Erstellen des Default-Labels:', error);
        throw error;
    }
}
