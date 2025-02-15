create table videos (
  id bigint primary key generated always as identity,
  title text not null,
  description text not null,
  url text,
  video_data jsonb,
  thumbnail text not null,
  platform text not null,
  duration integer not null,
  transcript text not null,
  tags text[] not null default '{}',
  video_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
); 