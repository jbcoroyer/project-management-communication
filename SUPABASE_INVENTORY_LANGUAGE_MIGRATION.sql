-- Langue des documents Print (tri par type + langue)
alter table public.inventory_items
  add column if not exists language text null;

comment on column public.inventory_items.language is 'Langue du document (catégorie Print uniquement)';

create index if not exists inventory_items_print_lang_idx on public.inventory_items (category, item_type, language)
  where category = 'Print';
