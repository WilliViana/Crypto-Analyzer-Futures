-- Create a table for public profiles using Supabase Auth
create table if not exists profiles (
    id uuid references auth.users on delete cascade not null primary key,
    updated_at timestamp with time zone,
    full_name text,
    avatar_url text,
    phone text,
    website text
);
-- Set up Row Level Security (RLS)
alter table profiles enable row level security;
create policy "Public profiles are viewable by everyone." on profiles for
select using (true);
create policy "Users can insert their own profile." on profiles for
insert with check (auth.uid() = id);
create policy "Users can update own profile." on profiles for
update using (auth.uid() = id);
-- Set up Storage for Avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true) on conflict (id) do nothing;
create policy "Avatar images are publicly accessible." on storage.objects for
select using (bucket_id = 'avatars');
create policy "Someone can upload an avatar." on storage.objects for
insert with check (
        bucket_id = 'avatars'
        and auth.uid() = owner
    );
create policy "Someone can update their own avatar." on storage.objects for
update using (
        bucket_id = 'avatars'
        and auth.uid() = owner
    );
-- Trigger to create profile on sign up
create or replace function public.handle_new_user() returns trigger as $$ begin
insert into public.profiles (id, full_name, avatar_url)
values (
        new.id,
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'avatar_url'
    );
return new;
end;
$$ language plpgsql security definer;
create or replace trigger on_auth_user_created
after
insert on auth.users for each row execute procedure public.handle_new_user();