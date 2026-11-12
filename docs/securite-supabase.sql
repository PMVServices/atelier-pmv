-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- SÉCURISATION DE SUPABASE — étape 3 : fermer la base à tout ce qui n'est pas un appareil connecté
-- (préparée le 12/11/2026 ; à coller dans Supabase > SQL Editor APRÈS que tous les appareils sont connectés, voir ci-dessous)
--
-- AVANT de coller :
--   1. la version de l'appli avec « Connexion de l'appareil » est en ligne (commit 00c7c20 ou plus récent) ;
--   2. le compte de l'atelier existe dans Supabase (Authentication > Users > Add user, « Auto Confirm User » coché) ;
--   3. CHAQUE appareil (tablettes, PC, poste douchette) est connecté : pastille de la personne > « Appareil non connecté — connecter ».
--      Un appareil resté non connecté verra, après ce SQL, l'écran « Connexion de l'appareil » (il suffira alors de s'y connecter).
--   4. une sauvegarde de la base a été faite (node scripts/sauvegarde.js).
--
-- Ce que fait ce SQL : sur TOUTES les tables du schéma « public » (y compris celles qui n'ont pas encore de protection), il active la
-- protection par lignes (RLS), supprime les anciennes règles « tout le monde » (allow anon all, acces_public…) et crée UNE règle :
-- seuls les appareils connectés (rôle « authenticated ») peuvent lire, écrire et supprimer. Il fait la même chose pour l'envoi, la
-- modification et la suppression des photos (dossier de stockage « photos »). Les photos restent AFFICHABLES par leur lien (dossier public) :
-- les passer en privé est l'étape 4.
-- Pour revenir en arrière : voir « ANNULER » en bas de ce fichier.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

do $$
declare
  t record;
  p record;
begin
  for t in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p')
  loop
    execute format('alter table public.%I enable row level security', t.relname);
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t.relname loop
      execute format('drop policy %I on public.%I', p.policyname, t.relname);
    end loop;
    execute format('create policy %I on public.%I for all to authenticated using (true) with check (true)', 'appareil_connecte', t.relname);
  end loop;
end $$;

-- photos (stockage) : envoi / modification / suppression réservés aux appareils connectés
do $$
declare
  p record;
begin
  if exists (select 1 from storage.buckets where id = 'photos') then
    for p in select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects' loop
      execute format('drop policy %I on storage.objects', p.policyname);
    end loop;
    create policy appareil_connecte_photos on storage.objects
      for all to authenticated
      using (bucket_id = 'photos') with check (bucket_id = 'photos');
  end if;
end $$;

-- Vérification (doit afficher, pour chaque table, rls_active = true et une seule règle « appareil_connecte » pour « authenticated »)
select c.relname as table_name,
       c.relrowsecurity as rls_active,
       (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as nb_regles,
       (select string_agg(p.policyname || ' [' || array_to_string(p.roles, ',') || ']', ' ; ')
          from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as regles
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind in ('r', 'p')
 order by c.relname;


-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- ANNULER (retour à l'ancien fonctionnement, base ouverte à tous) — à ne coller QU'EN CAS DE PROBLÈME, à la place du SQL ci-dessus :
--
-- do $$
-- declare t record; p record;
-- begin
--   for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r', 'p') loop
--     for p in select policyname from pg_policies where schemaname = 'public' and tablename = t.relname loop
--       execute format('drop policy %I on public.%I', p.policyname, t.relname);
--     end loop;
--     execute format('create policy %I on public.%I for all to public using (true) with check (true)', 'retour_ancien_acces', t.relname);
--   end loop;
-- end $$;
-- do $$
-- declare p record;
-- begin
--   for p in select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects' loop
--     execute format('drop policy %I on storage.objects', p.policyname);
--   end loop;
--   create policy retour_ancien_acces_photos on storage.objects for all to public using (bucket_id = 'photos') with check (bucket_id = 'photos');
-- end $$;
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
