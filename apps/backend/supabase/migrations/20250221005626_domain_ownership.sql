
-- Links domains to users
create table domain_ownership (
    id uuid default uuid_generate_v4() primary key,
    domain_id uuid references domains(id) not null,
    user_id uuid references auth.users(id) not null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

alter table domain_ownership enable row level security;

create policy "Users can view own domain ownership"
on domain_ownership
for select using (
  auth.uid() = user_id 
);

create policy "Users can view domains they own"
on domains
for select using (
  exists (
    select 1 from domain_ownership own
    where own.domain_id = domains.id
    and own.user_id = auth.uid()
  )
);

comment on table domain_ownership is 'Stores domain ownership for users';

-- Function to check if a domain is verified and owned by a user
create or replace function is_domain_verified_and_owned(
  p_domain text,
  p_user_id uuid
) returns boolean as $$
declare
  v_result boolean;
begin
  select exists(
    select 1
    from domains d
    join domain_ownership own on d.id = own.domain_id
    where d.domain = p_domain
    and d.verified = true
    and own.user_id = p_user_id
  ) into v_result;
  
  return v_result;
end;
$$ language plpgsql security definer;

comment on function is_domain_verified_and_owned is 'Checks if a domain is verified and owned by the specified user';

-- Function to get all domains owned by a user
create or replace function get_user_domains(
  p_user_id uuid
) returns table (
  id uuid,
  domain text,
  verified boolean,
  created_at timestamptz,
  updated_at timestamptz
) as $$
begin
  return query
  select d.id, d.domain, d.verified, d.created_at, d.updated_at
  from domains d
  join domain_ownership own on d.id = own.domain_id
  where own.user_id = p_user_id
  order by d.created_at desc;
end;
$$ language plpgsql security definer;

comment on function get_user_domains is 'Returns all domains owned by the specified user';

-- Add policies for domain_ownership
create policy "Service role can insert domain ownership"
on domain_ownership
for insert
to service_role
with check (true);

create policy "Service role can update domain ownership"
on domain_ownership
for update
to service_role
with check (true);