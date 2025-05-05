create table domains (
    id uuid default uuid_generate_v4() primary key,
    domain text not null unique,
    verified boolean default false,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

alter table domains enable row level security;

comment on table domains is 'Stores custom domains';

-- Add RLS policies for domains table
create policy "Service role can insert domains"
on domains
for insert
to service_role
with check (true);
