-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('SIH-Presentation', 'SIH-Presentation', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Allow team members to view their PPT" ON storage.objects;
DROP POLICY IF EXISTS "Allow team leads to upload PPT" ON storage.objects;
DROP POLICY IF EXISTS "Allow team leads to update PPT" ON storage.objects;
DROP POLICY IF EXISTS "Allow team leads to delete PPT" ON storage.objects;

-- 4. Policy: Allow anyone to view/read objects in 'SIH-Presentation'
CREATE POLICY "Allow anyone to view PPT" ON storage.objects
    FOR SELECT
    TO public
    USING ( bucket_id = 'SIH-Presentation' );

-- 5. Policy: Allow anyone to upload objects to 'SIH-Presentation'
CREATE POLICY "Allow anyone to upload PPT" ON storage.objects
    FOR INSERT
    TO public
    WITH CHECK ( bucket_id = 'SIH-Presentation' );

-- 6. Policy: Allow anyone to update objects in 'SIH-Presentation'
CREATE POLICY "Allow anyone to update PPT" ON storage.objects
    FOR UPDATE
    TO public
    USING ( bucket_id = 'SIH-Presentation' );

-- 7. Policy: Allow anyone to delete objects in 'SIH-Presentation'
CREATE POLICY "Allow anyone to delete PPT" ON storage.objects
    FOR DELETE
    TO public
    USING ( bucket_id = 'SIH-Presentation' );
