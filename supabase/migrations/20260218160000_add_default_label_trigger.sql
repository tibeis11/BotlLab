-- Migration: Setup trigger to add default label template for new breweries automatically

-- 1. Create the function
CREATE OR REPLACE FUNCTION public.create_default_label_on_brewery_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.label_templates (brewery_id, name, format_id, is_default, config)
  VALUES (
    NEW.id,
    'Standard Design (Portrait)',
    '6137',
    true,
    jsonb_build_object(
      'breweryId', NEW.id,
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
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Create the trigger
DROP TRIGGER IF EXISTS trigger_add_default_label ON breweries;
CREATE TRIGGER trigger_add_default_label
  AFTER INSERT ON breweries
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_label_on_brewery_insert();
