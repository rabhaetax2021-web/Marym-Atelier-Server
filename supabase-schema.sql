create table if not exists designers (
  name text primary key,
  created_at timestamptz not null default now()
);

create index if not exists designers_name_idx on designers(name);

create table if not exists dresses (
  id text primary key,
  name text not null,
  designer text,
  category text,
  price integer not null default 0,
  position integer,
  size text,
  color text,
  big_size boolean not null default false,
  "featured" boolean not null default false,
  images jsonb not null default '[]'::jsonb,
  details text,
  available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dresses_category_idx on dresses(category);
create index if not exists dresses_designer_idx on dresses(designer);

-- Table to store individual photos for dresses (supports multiple photos per dress)
create table if not exists dress_photos (
  id bigserial primary key,
  dress_id text references dresses(id) on delete cascade,
  url text not null,
  position integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists dress_photos_dress_id_idx on dress_photos(dress_id);
create index if not exists dress_photos_position_idx on dress_photos(position);

create table if not exists reservations (
  id text primary key,
  dress_id text references dresses(id) on delete set null,
  dress_name text,
  client_name text not null,
  weight integer,
  height integer,
  client_phone text not null,
  trial_date date,
  rent_date date,
  time text,
  notes text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reservations_dress_id_idx on reservations(dress_id);
create index if not exists reservations_status_idx on reservations(status);
create index if not exists reservations_rent_date_idx on reservations(rent_date);

create table if not exists faqs (
  id text primary key,
  question text not null,
  answer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);
