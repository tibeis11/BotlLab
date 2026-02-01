-- Migration: Add default label templates to existing breweries that don't have one
-- This ensures all squads have at least one label design (57x105 Portrait)

INSERT INTO public.label_templates (brewery_id, name, format_id, is_default, config)
SELECT
  b.id as brewery_id,
  'Standard Design (Portrait)' as name,
  '6137' as format_id,
  true as is_default,
  jsonb_build_object(
    'breweryId', b.id,
    'formatId', '6137',
    'orientation', 'p',
    'width', 57,
    'height', 105,
    'background', jsonb_build_object('type', 'image', 'value', '/labels/label_105x57.png'),
    'elements', jsonb_build_array(
      -- Element 1: Background Color
      jsonb_build_object(
        'id', gen_random_uuid(),
        'type', 'shape',
        'x', 0, 'y', 0, 'width', 57, 'height', 105,
        'rotation', 0, 'zIndex', 0,
        'content', '',
        'style', jsonb_build_object('backgroundColor', '#ffffff', 'color', '#000000', 'fontFamily', 'Helvetica', 'fontSize', 0, 'fontWeight', 'normal', 'textAlign', 'left'),
        'isLocked', false, 'isCanvasLocked', true, 'isDeletable', false, 'isVariable', false, 'name', 'Background Color'
      ),
      -- Element 2: Background Image
      jsonb_build_object(
        'id', gen_random_uuid(),
        'type', 'image',
        'x', 0, 'y', 0, 'width', 57, 'height', 105,
        'rotation', 0, 'zIndex', 1,
        'content', '/labels/label_105x57.png',
        'style', jsonb_build_object('color', '#000000', 'fontFamily', 'Helvetica', 'fontSize', 0, 'fontWeight', 'normal', 'textAlign', 'left'),
        'isLocked', false, 'isCanvasLocked', true, 'isDeletable', false, 'isVariable', false, 'name', 'Background Image'
      ),
      -- Element 3: Brand Logo
      jsonb_build_object(
        'id', gen_random_uuid(),
        'type', 'brand-logo',
        'x', 13, 'y', 5, 'width', 30, 'height', 8,
        'rotation', 0, 'zIndex', 2,
        'content', '',
        'style', jsonb_build_object('color', '#000000', 'fontFamily', 'Helvetica', 'fontSize', 0, 'fontWeight', 'normal', 'textAlign', 'center'),
        'isLocked', false, 'isCanvasLocked', false, 'isDeletable', true, 'isVariable', true, 'name', 'brand-logo'
      ),
      -- Element 4: QR Code
      jsonb_build_object(
        'id', gen_random_uuid(),
        'type', 'qr-code',
        'x', 11, 'y', 14, 'width', 35, 'height', 35,
        'rotation', 0, 'zIndex', 3,
        'content', '{{qr_code}}',
        'style', jsonb_build_object('color', '#000000', 'fontFamily', 'Helvetica', 'fontSize', 0, 'fontWeight', 'normal', 'textAlign', 'left'),
        'isLocked', false, 'isCanvasLocked', false, 'isDeletable', true, 'isVariable', true, 'name', 'qr-code'
      ),
      -- Element 5: Brand Footer
      jsonb_build_object(
        'id', gen_random_uuid(),
        'type', 'brand-footer',
        'x', 5, 'y', 93, 'width', 47, 'height', 7,
        'rotation', 0, 'zIndex', 4,
        'content', E'BotlLab | Digital Brew Lab\nbotllab.de',
        'style', jsonb_build_object('color', '#666666', 'fontFamily', 'Helvetica', 'fontSize', 6, 'fontWeight', 'bold', 'textAlign', 'center'),
        'isLocked', false, 'isCanvasLocked', false, 'isDeletable', true, 'isVariable', false, 'name', 'brand-footer'
      )
    )
  )
FROM public.breweries b
WHERE NOT EXISTS (
    SELECT 1 FROM public.label_templates lt WHERE lt.brewery_id = b.id
);
