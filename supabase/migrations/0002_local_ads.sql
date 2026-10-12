-- Galeri reklamları artık veritabanında değil, projedeki dosyalarda (src/data/pulled.json).
-- Bu yüzden remixes.ad_id bir ads satırına bağlı olmayan metin kimliğine dönüştürülür.
alter table public.remixes drop constraint if exists remixes_ad_id_fkey;
alter table public.remixes alter column ad_id type text using ad_id::text;
