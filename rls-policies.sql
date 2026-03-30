-- ============================================
-- RLS POLICIES VOOR RIKKEN APP
-- ============================================
-- Datum: 27 maart 2026
--
-- INSTRUCTIES:
-- 1. Ga naar Supabase Dashboard → SQL Editor
-- 2. Maak een nieuwe query
-- 3. Plak deze hele file
-- 4. Klik op "Run"
--
-- Dit script maakt alle RLS policies aan voor:
-- - profiles (admin kan alles, display alleen eigen)
-- - spelers (admin kan CRUD, display kan alleen lezen)
-- - locaties (admin kan CRUD, display kan alleen lezen)
-- - spelavonden (iedereen kan CRUD behalve delete = admin only)
-- - rondes (iedereen kan CRUD behalve delete = admin only)
-- ============================================

-- ============================================
-- 1. PROFILES TABEL
-- ============================================

-- SELECT: Iedereen kan alle profiles zien
CREATE POLICY "Iedereen kan profiles zien"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- UPDATE: Admin kan alles updaten
CREATE POLICY "Admin kan alle profiles updaten"
ON profiles FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- UPDATE: Display kan alleen eigen profile updaten
CREATE POLICY "Display kan eigen profile updaten"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid() AND role = 'display');

-- DELETE: Alleen admin kan profiles verwijderen
CREATE POLICY "Admin kan profiles verwijderen"
ON profiles FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- INSERT: Nieuwe users worden aangemaakt via Supabase Auth trigger
-- Geen INSERT policy nodig (gebeurt server-side)


-- ============================================
-- 2. SPELERS TABEL
-- ============================================

-- SELECT: Iedereen kan alle spelers zien
CREATE POLICY "Iedereen kan spelers zien"
ON spelers FOR SELECT
TO authenticated
USING (true);

-- INSERT: Alleen admin kan spelers aanmaken
CREATE POLICY "Admin kan spelers aanmaken"
ON spelers FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- UPDATE: Alleen admin kan spelers updaten
CREATE POLICY "Admin kan spelers updaten"
ON spelers FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- DELETE: Alleen admin kan spelers verwijderen
CREATE POLICY "Admin kan spelers verwijderen"
ON spelers FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);


-- ============================================
-- 3. LOCATIES TABEL
-- ============================================

-- SELECT: Iedereen kan locaties zien
CREATE POLICY "Iedereen kan locaties zien"
ON locaties FOR SELECT
TO authenticated
USING (true);

-- INSERT: Alleen admin kan locaties aanmaken
CREATE POLICY "Admin kan locaties aanmaken"
ON locaties FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- UPDATE: Alleen admin kan locaties updaten
CREATE POLICY "Admin kan locaties updaten"
ON locaties FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- DELETE: Alleen admin kan locaties verwijderen
CREATE POLICY "Admin kan locaties verwijderen"
ON locaties FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);


-- ============================================
-- 4. SPELAVONDEN TABEL
-- ============================================

-- SELECT: Iedereen kan spelavonden zien
CREATE POLICY "Iedereen kan spelavonden zien"
ON spelavonden FOR SELECT
TO authenticated
USING (true);

-- INSERT: Iedereen kan spelavonden aanmaken
CREATE POLICY "Iedereen kan spelavonden aanmaken"
ON spelavonden FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE: Iedereen kan spelavonden updaten (bijv. status wijzigen, afsluiten)
CREATE POLICY "Iedereen kan spelavonden updaten"
ON spelavonden FOR UPDATE
TO authenticated
USING (true);

-- DELETE: Alleen admin kan spelavonden verwijderen
CREATE POLICY "Admin kan spelavonden verwijderen"
ON spelavonden FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);


-- ============================================
-- 5. RONDES TABEL
-- ============================================

-- SELECT: Iedereen kan rondes zien
CREATE POLICY "Iedereen kan rondes zien"
ON rondes FOR SELECT
TO authenticated
USING (true);

-- INSERT: Iedereen kan rondes aanmaken
CREATE POLICY "Iedereen kan rondes aanmaken"
ON rondes FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE: Iedereen kan rondes updaten (voor correcties tijdens spelen)
CREATE POLICY "Iedereen kan rondes updaten"
ON rondes FOR UPDATE
TO authenticated
USING (true);

-- DELETE: Alleen admin kan rondes verwijderen
CREATE POLICY "Admin kan rondes verwijderen"
ON rondes FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);


-- ============================================
-- 6. API_KEYS TABEL (al correct ingesteld)
-- ============================================
-- Deze tabel heeft al policies, maar voor volledigheid:
-- Voeg alleen DELETE policy toe als die nog niet bestaat

CREATE POLICY "Admin kan api_keys verwijderen"
ON api_keys FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);


-- ============================================
-- KLAAR!
-- ============================================
-- Na het uitvoeren van dit script:
-- 1. Test inloggen
-- 2. Test spelers lijst bekijken
-- 3. Test nieuwe spelavond aanmaken
-- 4. Test rondes toevoegen
--
-- Als admin account: test ook spelers/locaties toevoegen
-- Als display account: check dat je alleen kan lezen
-- ============================================
