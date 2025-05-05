-- Verification table for temporary DNS codes/tokens
create table domain_verifications (
    id uuid default uuid_generate_v4() primary key,
    domain_id uuid not null references domains(id),
    user_id uuid not null references auth.users(id),
    created_at timestamptz default now(),
    used_at timestamptz,
    updated_at timestamptz default now()
);

comment on table domain_verifications is 'Stores DNS challenge/verification tokens for a domain';

alter table domain_verifications enable row level security;

-- Policy for inserts by your service role
create policy "Service role can insert domain verifications"
on domain_verifications
for insert
to service_role
with check (true);

-- Allow the service role to update domain verifications (e.g. mark used_at)
create policy "Service role can update domain verifications"
on domain_verifications
for update
to service_role
using (true)
with check (true);
