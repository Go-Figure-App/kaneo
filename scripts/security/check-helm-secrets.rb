require 'yaml'
require 'open3'

def render(*args)
  stdout, stderr, status = Open3.capture3('helm', 'template', 'security-test', 'charts/tracing', *args)
  raise stderr unless status.success?
  YAML.load_stream(stdout).compact
end

def verify(condition, message)
  raise message unless condition
end

def app_env(docs)
  deployment = docs.find { |d| d['kind'] == 'Deployment' && !d['metadata']['name'].end_with?('-postgresql') }
  deployment.fetch('spec').fetch('template').fetch('spec').fetch('containers').first.fetch('env')
end

secret = 'test-auth-secret-at-least-32-characters'
args = ['--set', "tracing.env.authSecret=#{secret}", '--set', 'tracing.env.clientUrl=https://tracing.example.com']
first = render(*args)
second = render(*args, '--is-upgrade')
[first, second].each do |docs|
  env = app_env(docs).find { |e| e['name'] == 'AUTH_SECRET' }
  verify(!env.key?('value'), 'AUTH_SECRET must not be a literal in the Deployment')
  ref = env.fetch('valueFrom').fetch('secretKeyRef')
  resource = docs.find { |d| d['kind'] == 'Secret' && d['metadata']['name'] == ref['name'] }
  verify(resource.fetch('stringData').fetch(ref['key']) == secret, 'Secret value must be preserved on install and upgrade')
  docs.select { |d| d['kind'] == 'Deployment' }.each do |deployment|
    verify(!deployment.to_s.include?(secret), 'Secret material leaked into a Deployment')
  end
end

external = render('--set', 'tracing.env.clientUrl=https://tracing.example.com', '--set', 'tracing.env.existingSecret.enabled=true', '--set', 'tracing.env.existingSecret.name=operator-secret')
ref = app_env(external).find { |e| e['name'] == 'AUTH_SECRET' }.fetch('valueFrom').fetch('secretKeyRef')
verify(ref == { 'name' => 'operator-secret', 'key' => 'auth-secret' }, 'Existing secret reference changed')
verify(external.none? { |d| d['kind'] == 'Secret' && d['metadata']['name'].end_with?('-auth') }, 'Existing secret must not be overwritten')
_, _, status = Open3.capture3('helm', 'template', 'security-test', 'charts/tracing', '--set', 'tracing.env.existingSecret.enabled=true')
verify(!status.success?, 'Missing external secret name must reject the configuration')

secured = render(*args, '--set', 'podSecurityContext.runAsNonRoot=true', '--set', 'podSecurityContext.seccompProfile.type=RuntimeDefault')
deployment = secured.find { |d| d['kind'] == 'Deployment' && !d['metadata']['name'].end_with?('-postgresql') }
context = deployment['spec']['template']['spec']['securityContext']
verify(context['runAsNonRoot'] && context.dig('seccompProfile', 'type') == 'RuntimeDefault', 'Documented pod security settings are not applied')
runtime_mount = deployment['spec']['template']['spec']['containers'].first.fetch('volumeMounts').find { |mount| mount['mountPath'] == '/var/lib/kaneo' }
verify(runtime_mount && !runtime_mount['readOnly'], 'Tracing runtime storage must be writable')
runtime_volume = deployment['spec']['template']['spec'].fetch('volumes').find { |volume| volume['name'] == runtime_mount['name'] }
verify(runtime_volume && runtime_volume['emptyDir'] == {}, 'Tracing runtime storage must use emptyDir')
puts 'Helm secret, upgrade, external-secret validation and pod security checks passed'

['', '   ', 'ftp://example.com', 'https://user:secret@example.com', 'https://example.com/path', 'https://example.com?x=1', 'https://example.com#fragment'].each do |url|
  _, stderr, status = Open3.capture3('helm', 'template', 'security-test', 'charts/tracing', '--set', "tracing.env.authSecret=#{secret}", '--set-string', "tracing.env.clientUrl=#{url}")
  verify(!status.success? && stderr.include?('tracing.env.clientUrl'), "Invalid clientUrl must produce an actionable error: #{url.inspect}")
end
['https://tracing.example.com', 'http://localhost:8080', 'http://[::1]:8080/', ' https://tracing.example.com/ '].each do |url|
  docs = render(*args, '--set-string', "tracing.env.clientUrl=#{url}")
  client = app_env(docs).find { |env| env['name'] == 'TRACING_CLIENT_URL' }
  verify(client['value'] == url.strip.sub(%r{/$}, ''), 'Public origin must be trimmed and safe for API URL derivation')
end
puts 'Helm required-origin validation and URL rendering checks passed'

# An initialized legacy PVC keeps its database and role during the rebrand.
legacy = render(*args, '--is-upgrade', '--set', 'nameOverride=kaneo', '--set', 'fullnameOverride=kaneo', '--set', 'postgresql.auth.database=kaneo', '--set', 'postgresql.auth.username=kaneo_user', '--set', 'postgresql.auth.existingSecret=old-postgres')
postgres = legacy.find { |d| d['kind'] == 'Deployment' && d['metadata']['name'] == 'kaneo-postgresql' }
postgres_env = postgres.fetch('spec').fetch('template').fetch('spec').fetch('containers').first.fetch('env')
verify(postgres_env.find { |env| env['name'] == 'POSTGRES_DB' }['value'] == 'kaneo', 'Upgrade must preserve the initialized database name')
verify(postgres_env.find { |env| env['name'] == 'POSTGRES_USER' }['value'] == 'kaneo_user', 'Upgrade must preserve the initialized database role')
password_ref = postgres_env.find { |env| env['name'] == 'POSTGRES_PASSWORD' }.fetch('valueFrom').fetch('secretKeyRef')
verify(password_ref == { 'name' => 'old-postgres', 'key' => 'password' }, 'Upgrade must preserve the PostgreSQL password secret')
database = app_env(legacy).find { |env| env['name'] == 'DATABASE_URL' }.fetch('value')
verify(database == 'postgresql://kaneo_user:$(TRACING_POSTGRES_PASSWORD)@kaneo-postgresql:5432/kaneo', 'App must connect to the existing database and role')
verify(legacy.any? { |d| d['kind'] == 'PersistentVolumeClaim' && d['metadata']['name'] == 'kaneo-postgresql-data' }, 'Upgrade must retain the PostgreSQL PVC name')
puts 'Helm legacy database identity and PVC upgrade checks passed'

# Retained release names still route to the renamed application Service.
routed = render(*args, '--set', 'postgresql.auth.existingSecret=old-postgres', '--is-upgrade', '--set', 'nameOverride=kaneo', '--set', 'fullnameOverride=kaneo', '--set', 'ingress.enabled=true', '--set', 'ingress.hosts[0].host=tracing.example.com', '--set', 'ingress.hosts[0].paths[0].path=/', '--set', 'ingress.hosts[0].paths[0].pathType=Prefix', '--set', 'ingress.hosts[0].paths[0].service=tracing', '--set', 'ingress.hosts[0].paths[0].port=5173', '--set', 'gateway.enabled=true', '--set', 'gateway.rules[0].backendRefs[0].service=tracing', '--set', 'gateway.rules[0].backendRefs[0].port=5173')
service = routed.find { |d| d['kind'] == 'Service' && d['metadata']['name'] == 'kaneo-tracing' }
verify(service, 'Upgrade must expose the renamed application Service')
ingress = routed.find { |d| d['kind'] == 'Ingress' }
ingress_backend = ingress.fetch('spec').fetch('rules').first.fetch('http').fetch('paths').first.fetch('backend').fetch('service')
gateway = routed.find { |d| d['kind'] == 'HTTPRoute' }
gateway_backend = gateway.fetch('spec').fetch('rules').first.fetch('backendRefs').first
[ingress_backend, gateway_backend].each do |backend|
  verify(backend['name'] == service['metadata']['name'], 'Migrated route must resolve to the application Service')
end
verify(ingress_backend.dig('port', 'number') == 5173 && gateway_backend['port'] == 5173, 'Migrated routes must retain the application port')
puts 'Helm retained release name and migrated routing checks passed'
