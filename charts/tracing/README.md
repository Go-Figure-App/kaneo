# Tracing Helm Chart
This Helm chart deploys [Tracing](https://github.com/Go-Figure-App/tracing), project management that doesn't become the project.
## Introduction
This chart bootstraps a Tracing deployment on a Kubernetes cluster using the Helm package manager. It deploys both the API backend and Web frontend components, along with a PostgreSQL database, with optional ingress or Gateway API resources.
## Prerequisites
- Kubernetes 1.23+
- Helm 3.2.0+
- PV provisioner support in the underlying infrastructure (if persistence is enabled)
## Quick Start
### Basic Installation
Install directly from GHCR:
```bash
helm install tracing ./charts/tracing \
  --namespace tracing \
  --create-namespace
# Access locally
kubectl port-forward svc/tracing-tracing 5173:5173 -n tracing
```
Open [http://localhost:5173](http://localhost:5173) and you're ready to go.
### Production Setup with Ingress
For real deployments, you'll want proper ingress:
```bash
helm install tracing ./charts/tracing \
  --namespace tracing \
  --create-namespace \
  --set ingress.enabled=true \
  --set ingress.className=nginx \
  --set "ingress.hosts[0].host=pm.yourcompany.com"
```
### Production Setup with Gateway API
If your cluster already has Gateway API CRDs and a `Gateway` configured, you can expose Tracing with an `HTTPRoute`:
```bash
helm install tracing ./charts/tracing \
  --namespace tracing \
  --create-namespace \
  --set gateway.enabled=true \
  --set "gateway.parentRefs[0].name=main-gateway" \
  --set "gateway.parentRefs[0].namespace=gateway-system" \
  --set "gateway.parentRefs[0].sectionName=https" \
  --set "gateway.hostnames[0]=pm.yourcompany.com"
```
## Installing the Chart
To install the published chart with the release name `my-tracing`:
```bash
helm install my-tracing ./charts/tracing
```
To install from a local checkout instead:
```bash
helm install my-tracing ./charts/tracing
```
The command deploys Tracing on the Kubernetes cluster with default configuration. The [Parameters](#parameters) section lists the parameters that can be configured during installation.
## Uninstalling the Chart
To uninstall/delete the `my-tracing` deployment:
```bash
helm uninstall my-tracing
```
## Parameters
### Global parameters
| Name                     | Description                                                                                                        | Value       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------ | ----------- |
| `nameOverride`           | String to partially override the fullname template (will maintain the release name)                                | `""`        |
| `fullnameOverride`       | String to fully override the fullname template                                                                     | `""`        |
| `replicaCount`           | Number of replicas (ignored if autoscaling is enabled)                                                             | `1`         |
| `enableServiceLinks`     | Controls Pod's enableServiceLinks field                                                                            | `false`   |
| `topologySpreadConstraints` | Controls Pod's topologySpreadConstraints field                                                                         | `[]`   |
### Autoscaling parameters
| Name                                | Description                                                                                                        | Value       |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------- |
| `autoscaling.enabled`               | Enable autoscaling for the deployment                                                                              | `false`     |
| `autoscaling.minReplicas`           | Minimum number of replicas                                                                                         | `1`         |
| `autoscaling.maxReplicas`           | Maximum number of replicas                                                                                         | `10`        |
| `autoscaling.targetCPUUtilizationPercentage` | Target CPU utilization percentage                                                                         | `80`        |
When CPU autoscaling is enabled, set `tracing.resources.requests.cpu`; Kubernetes cannot calculate CPU utilization without a CPU request.
### PostgreSQL Database parameters
| Name                                | Description                                                                                                        | Value                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| `postgresql.enabled`                | Deploy PostgreSQL as part of this chart                                                                           | `true`                          |
| `postgresql.image.repository`       | PostgreSQL image repository                                                                                        | `postgres`                      |
| `postgresql.image.tag`              | PostgreSQL image tag                                                                                               | `16-alpine`                     |
| `postgresql.image.pullPolicy`       | PostgreSQL image pull policy                                                                                      | `IfNotPresent`                  |
| `postgresql.auth.database`          | PostgreSQL database name                                                                                           | `tracing`                         |
| `postgresql.auth.username`          | PostgreSQL username                                                                                                | `tracing_user`                    |
| `postgresql.auth.password`          | PostgreSQL password                                                                                                | `tracing_password`                |
| `postgresql.auth.existingSecret`    | Name of existing secret containing PostgreSQL credentials                                                          | `""`                            |
| `postgresql.persistence.enabled`    | Enable persistence for PostgreSQL data                                                                             | `true`                          |
| `postgresql.persistence.size`       | PostgreSQL PVC size                                                                                                | `8Gi`                           |
| `postgresql.persistence.storageClass` | PostgreSQL PVC storage class                                                                                     | `""`                            |
| `postgresql.persistence.accessMode` | PostgreSQL PVC access mode                                                                                         | `ReadWriteOnce`                 |
| `postgresql.service.type`           | PostgreSQL service type                                                                                            | `ClusterIP`                     |
| `postgresql.service.port`           | PostgreSQL service port                                                                                            | `5432`                          |
| `postgresql.resources`              | Resource requests and limits for PostgreSQL container                                                              | `{}`                            |
### Tracing application parameters
| Name                                | Description                                                                                                        | Value                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| `tracing.image.repository`            | Tracing image repository                                                                                             | `tracing`        |
| `tracing.image.tag`                   | Tracing image tag. Build and load the local image, or choose a published image you control                                                         | `local`                            |
| `tracing.image.pullPolicy`            | Tracing image pull policy                                                                                            | `IfNotPresent`                  |
| `tracing.service.type`                | Tracing service type                                                                                                 | `ClusterIP`                     |
| `tracing.service.port`                | Tracing service port                                                                                                 | `5173`                          |
| `tracing.service.targetPort`          | Tracing container port                                                                                               | `5173`                          |
| `tracing.env`                         | Environment variables for the Tracing container                                                                      | See `values.yaml`               |
| `tracing.env.clientUrl`               | Public URL of the Tracing instance. **Required for every deployment**; sets `TRACING_CLIENT_URL`. Helm rejects missing values and URLs with credentials, paths, queries or fragments before creating resources. Note: this key is case-sensitive (`clientUrl`, not `clientURL`). | `""` |
| `tracing.env.corsOrigins`             | Allowed CORS origins as a comma-separated string or YAML list                                                      | `[]`                            |
| `tracing.env.authSecret`              | Required Better Auth secret (minimum 32 characters), stored in a chart-managed Secret; ignored if existingSecret is enabled                           | `""` |
| `tracing.env.existingSecret.enabled`  | Whether to use an existing secret for `AUTH_SECRET`                                                                | `false`                         |
| `tracing.env.existingSecret.name`     | Name of the existing secret containing `AUTH_SECRET`                                                               | `""`                            |
| `tracing.env.existingSecret.key`      | Key in the existing secret that contains `AUTH_SECRET`                                                             | `auth-secret`                   |
| `tracing.env.disableRegistration`     | Disable new user registration                                                                                      | `false`                         |
| `tracing.env.disablePasswordRegistration` | Disable password-based account creation while keeping social/OIDC registration available                        | `false`                         |
| `tracing.env.disableEmailOtpSignIn`   | Use email/password sign-in instead of verification codes when SMTP is configured                                   | `false`                         |
| `tracing.env.database.external.enabled` | Use external PostgreSQL database (set postgresql.enabled to false)                                               | `false`                         |
| `tracing.env.database.external.host`  | External PostgreSQL host                                                                                           | `""`                            |
| `tracing.env.database.external.port`  | External PostgreSQL port                                                                                           | `5432`                          |
| `tracing.env.database.external.database` | External PostgreSQL database name                                                                               | `tracing`                         |
| `tracing.env.database.external.username` | External PostgreSQL username                                                                                    | `tracing_user`                    |
| `tracing.env.database.external.password` | External PostgreSQL password                                                                                    | `""`                            |
| `tracing.env.database.external.existingSecret.enabled` | Use an existing secret for the external database connection URI                             | `false`                         |
| `tracing.env.database.external.existingSecret.name` | Name of the secret containing the database connection URI                                    | `""`                            |
| `tracing.env.database.external.existingSecret.passwordKey` | Key in the secret whose value is a full PostgreSQL connection URI                       | `postgres_uri`                  |
| `tracing.extraEnv`                    | Additional Kubernetes EnvVar entries appended to the Tracing container                                               | `[]`                            |
| `tracing.extraEnvFrom`                | Additional Kubernetes EnvFromSource entries appended to the Tracing container                                        | `[]`                            |
| `tracing.resources`                   | Resource requests and limits for the Tracing container (optional, disabled by default)                               | `{}`                            |
| `podSecurityContext`                | Security context applied at the Pod level                                                                          | `{}`                            |
| `tracing.securityContext`             | Security context applied at the Tracing container level                                                              | `{}`                            |
### Ingress parameters
| Name                                | Description                                                                                                        | Value                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| `ingress.enabled`                   | Enable ingress                                                                                                     | `false`                         |
| `ingress.className`                 | Ingress class name                                                                                                 | `""`                            |
| `ingress.annotations`               | Ingress annotations                                                                                                | `{}`                            |
| `ingress.hosts`                     | Ingress hosts configuration                                                                                        | See `values.yaml`               |
| `ingress.tls`                       | Ingress TLS configuration                                                                                          | `[]`                            |
### Gateway API parameters
| Name                                | Description                                                                                                        | Value                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| `gateway.enabled`                   | Enable Gateway API `HTTPRoute` creation                                                                            | `false`                         |
| `gateway.annotations`               | Annotations added to the `HTTPRoute`                                                                               | `{}`                            |
| `gateway.labels`                    | Extra labels added to the `HTTPRoute`                                                                              | `{}`                            |
| `gateway.parentRefs`                | Parent Gateway listener references for attaching the `HTTPRoute`                                                   | `[]`                            |
| `gateway.hostnames`                 | Hostnames exposed by the `HTTPRoute`                                                                               | `[]`                            |
| `gateway.rules`                     | Gateway API routing rules mapping paths to the chart services                                                      | See `values.yaml`               |
## Configuration Examples
### Minimal Configuration
```yaml
# values.yaml
tracing:
  env:
    authSecret: "your-secure-auth-secret-at-least-32-characters"
    clientUrl: "https://your-domain.com"
ingress:
  enabled: true
  className: nginx
  annotations: {}
  hosts:
    - host: your-domain.com
      paths:
        - path: /
          pathType: Prefix
          service: tracing
          port: 5173
```
### Production Configuration with TLS
```yaml
# values.yaml
replicaCount: 1
# PostgreSQL configuration
postgresql:
  auth:
    password: "your-secure-db-password"
  persistence:
    size: 20Gi
    storageClass: "managed-premium"
  resources:
    limits:
      cpu: 500m
      memory: 512Mi
    requests:
      cpu: 100m
      memory: 128Mi
# Tracing configuration
tracing:
  resources:
    limits:
      cpu: 1000m
      memory: 1Gi
    requests:
      cpu: 200m
      memory: 256Mi
  env:
    authSecret: "your-secure-auth-secret-at-least-32-characters"
    clientUrl: "https://your-domain.com"
ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
  hosts:
    - host: your-domain.com
      paths:
        - path: /
          pathType: Prefix
          service: tracing
          port: 5173
  tls:
    - secretName: tracing-tls
      hosts:
        - your-domain.com
```
### Production Configuration with Traefik
If you're running Traefik as your ingress controller (common in self-hosted clusters), configure the ingress directly rather than through the chart's built-in ingress support:
```yaml
# values.yaml
tracing:
  env:
    authSecret: "your-secure-auth-secret-at-least-32-characters"
    clientUrl: "https://tracing.your-domain.com"
```
```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: tracing-ingress
  namespace: tracing
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: traefik
  rules:
    - host: tracing.your-domain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: tracing-tracing
                port:
                  number: 5173
  tls:
    - hosts:
        - tracing.your-domain.com
      secretName: tracing-tls
```
### Using External PostgreSQL Database
If you prefer to use an external PostgreSQL database instead of the bundled one:
```yaml
# values.yaml
# Disable bundled PostgreSQL
postgresql:
  enabled: false
tracing:
  env:
    authSecret: "your-secure-auth-secret-at-least-32-characters"
    database:
      external:
        enabled: true
        host: "your-postgres-host.com"
        port: 5432
        database: "tracing"
        username: "tracing_user"
        password: "your-db-password"
```
### Using an Existing Secret for Sensitive Data
For production environments, it's recommended to store sensitive data like the auth secret and database credentials in Kubernetes Secrets:
When `postgresql.auth.existingSecret` is used with bundled PostgreSQL, the password is expanded by Kubernetes into `DATABASE_URL` at runtime and must be URL-safe. If your password contains reserved URI characters such as `@`, `:`, `/`, `#`, `%`, or spaces, use an external database and provide the complete connection URI through `tracing.env.database.external.existingSecret`.
```bash
# Create a Secret for sensitive data
kubectl create secret generic tracing-secrets \
  --namespace tracing \
  --from-literal=auth-secret="your-secure-auth-secret-at-least-32-characters" \
  --from-literal=postgres-password="your-secure-db-password"
```
Then reference these secrets in your values:
```yaml
# values.yaml
postgresql:
  auth:
    existingSecret: "tracing-secrets"
    secretKeys:
      userPasswordKey: "postgres-password"
tracing:
  env:
    existingSecret:
      enabled: true
      name: "tracing-secrets"
      key: "auth-secret"
```
#### Using an Existing Secret with External PostgreSQL
When using an external database, the secret must contain a full PostgreSQL connection URI rather than just the password. Any special characters in the password (such as `@`, `:`, `/`) must be [percent-encoded](https://developer.mozilla.org/en-US/docs/Glossary/Percent-encoding).
```bash
# Create the secret with a full connection URI
kubectl create secret generic tracing-secrets \
  --namespace tracing \
  --from-literal=auth-secret="your-secure-auth-secret-at-least-32-characters" \
  --from-literal=postgres_uri="postgresql://tracing_user:your-password@your-host:5432/tracing"
```
```yaml
# values.yaml
postgresql:
  enabled: false

tracing:
  env:
    clientUrl: "https://tracing.your-domain.com"
    existingSecret:
      enabled: true
      name: "tracing-secrets"
      key: "auth-secret"
    database:
      external:
        enabled: true
        host: "your-postgres-host.com"
        port: 5432
        database: "tracing"
        username: "tracing_user"
        password: ""
        existingSecret:
          enabled: true
          name: "tracing-secrets"
          passwordKey: postgres_uri
```
## Database Management
### PostgreSQL Configuration
The chart deploys PostgreSQL 16 (Alpine) by default with the following configuration:
- Database name: `tracing`
- Username: `tracing_user`
- Default password: `tracing_password` (change this in production!)
- Persistent storage: 8Gi (configurable)
The bundled PostgreSQL deployment is intended for development, trials, and small self-hosted installs. For production environments, use an external managed PostgreSQL database by setting `postgresql.enabled=false` and configuring `tracing.env.database.external`.
Bundled PostgreSQL credentials are only applied when PostgreSQL initializes an empty data directory. If a PVC already exists, changing `postgresql.auth.password` or `postgresql.auth.existingSecret` updates the Pod environment but does not rotate the password inside the existing database. For local retesting with a new password, uninstall the release and delete the test PVC before reinstalling:
```bash
helm uninstall tracing -n tracing-test
kubectl delete pvc tracing-postgresql-data -n tracing-test --ignore-not-found
```
To preserve data, rotate the password inside PostgreSQL first, then update the Helm values to match.
### Backup and Recovery
For production deployments, consider implementing regular database backups:
```bash
# Example backup command
kubectl exec -it deployment/my-tracing-postgresql -- pg_dump -U tracing_user tracing > tracing-backup.sql
```
### Migration from SQLite
If you're migrating from a previous SQLite-based installation, you'll need to:
1. Export your data from SQLite
2. Deploy the new PostgreSQL-based chart
3. Import your data into PostgreSQL
Report migration issues in the [Tracing repository](https://github.com/Go-Figure-App/tracing/issues).
## Troubleshooting
### "invalid origin" error on login
Tracing's API validates the `Origin` header on every request against `TRACING_CLIENT_URL`. The chart now requires `clientUrl` before rendering. On older deployments, an unset or incorrect value can cause login failures.

Set `clientUrl` to the URL users access Tracing from:
```yaml
tracing:
  env:
    clientUrl: "https://tracing.your-domain.com"
```

> **Note:** The key is `clientUrl` (camelCase). `clientURL` (all-caps) does not configure this value; Helm reports the missing required `clientUrl`.

### Pods crash immediately after upgrading to use `existingSecret`
If pods enter `CrashLoopBackOff` after switching to an existing secret for the external database, the connection URI in the secret is likely wrong. Check what the pod is actually using:
```bash
kubectl get secret tracing-secrets -n tracing \
  -o jsonpath='{.data.postgres_uri}' | base64 -d
```
Common causes:
- Wrong password
- Password contains special characters that need percent-encoding (e.g. `p@ss` → `p%40ss`)
- Incorrect host, port, or database name in the URI

### PodSecurity warnings on install/upgrade
On clusters with Pod Security Admission enabled, you may see warnings like `would violate PodSecurity "restricted:latest"`. The chart exposes `podSecurityContext` and `tracing.securityContext` to address these. See the [Security](#security) section for recommended values.
## Architecture
This chart deploys the following components:
1. **Tracing application**: Serves the web UI and API from the combined Tracing image
2. **PostgreSQL Database**: Stores all application data with proper relational integrity
The Tracing application and PostgreSQL run in separate pods for resource isolation and simpler database lifecycle management.
## Production Environment
For production deployments, you should:
1. Set secure values for `AUTH_SECRET` and PostgreSQL passwords
2. Use an Ingress controller to expose the application
3. Configure TLS for secure access
4. Set appropriate resource limits and requests
5. Enable persistent storage with appropriate storage classes
6. Consider using external PostgreSQL for better scalability
```yaml
ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
  hosts:
    - host: your-domain.com
      paths:
        - path: /
          pathType: Prefix
          service: tracing
          port: 5173
  tls:
    - secretName: tracing-tls
      hosts:
        - your-domain.com
```
## Using Gateway API
As an alternative to Ingress, the chart can create an `HTTPRoute` for the Kubernetes Gateway API:
```yaml
# values.yaml
gateway:
  enabled: true
  parentRefs:
    - name: main-gateway
      namespace: gateway-system
      sectionName: https
  hostnames:
    - tracing.example.com
```
By default the chart creates one Gateway API rule:
1. `/` goes to the Tracing service
If you need custom matching or multiple backend references, override `gateway.rules` directly. Each `backendRefs` entry follows the same pattern as ingress and uses the chart-specific `service` field (`tracing`), which is expanded to the release-specific Service name.
## Security
For production deployments, consider the following security recommendations:
1. Use secure `AUTH_SECRET` and PostgreSQL passwords, preferably stored in Kubernetes Secrets
2. Enable TLS for ingress or Gateway API
3. Enable and set resource limits to prevent resource exhaustion
4. Use a dedicated storage class for the PostgreSQL database
5. Consider using a network policy to restrict traffic between components
6. Regularly update PostgreSQL and application images
### Pod Security Context
On clusters with Pod Security Admission enforcement, set the following to satisfy the `restricted` policy:
```yaml
podSecurityContext:
  runAsNonRoot: true
  seccompProfile:
    type: RuntimeDefault

tracing:
  securityContext:
    allowPrivilegeEscalation: false
    capabilities:
      drop: ["ALL"]
```
### OpenShift and read-only containers
Tracing supports OpenShift's assigned UID. The chart mounts an `emptyDir` at `/var/lib/kaneo` for generated frontend assets, nginx state, and temporary files. These files are recreated at startup; application data remains in PostgreSQL and the configured object storage.

Leave `runAsUser`, `runAsGroup`, and `fsGroup` unset on OpenShift so its security policy can assign permitted IDs. With an external PostgreSQL database, the Tracing container can use:
```yaml
podSecurityContext:
  runAsNonRoot: true
  seccompProfile:
    type: RuntimeDefault

tracing:
  securityContext:
    readOnlyRootFilesystem: true
    allowPrivilegeEscalation: false
    capabilities:
      drop: ["ALL"]
```
The bundled PostgreSQL image has its own platform requirements; use an OpenShift-compatible database deployment or an external database on OpenShift.

When running the combined or standalone web image outside Helm with a read-only root filesystem, mount writable storage at `/var/lib/kaneo`. For example:
```bash
docker run --read-only \
  --tmpfs /var/lib/kaneo:rw,mode=0770,uid=1001,gid=0 \
  --env-file .env -p 5173:5173 tracing:local
```
For a bind mount, grant write access to the container's UID or a group it belongs to. The image's default user is UID 1001 with GID 0; arbitrary UIDs can write its runtime directory through GID 0 when the root filesystem is writable.

nginx serves the web app from `/var/lib/kaneo/html`, where startup writes the runtime configuration, and reads server configuration copied from `/etc/nginx/conf.d` into `/var/lib/kaneo/nginx/conf.d`. If you mount your own server configuration, set `root /var/lib/kaneo/html;`. The previous `/usr/share/nginx/html` still holds the unconfigured build, so a config that serves it breaks API calls and sign-in; startup logs a warning when a config still uses that path. Files you mount into `/usr/share/nginx/html`, such as a custom favicon, are still copied into `/var/lib/kaneo/html` and served, and startup never writes to them. Templates in `/etc/nginx/templates` still render at startup, and `default.conf.template` replaces the bundled server configuration.

### Registration Control
By default, user registration is enabled. To disable new user registration:
```yaml
tracing:
  env:
    disableRegistration: true
```
This will prevent new users from registering while still allowing existing users to log in. The registration option will be hidden from the login page.

### Authentication secret storage

The chart stores `tracing.env.authSecret` in a Kubernetes Secret and the application Deployment references its `auth-secret` key. Upgrades preserve the supplied value; the chart does not generate a new signing secret. For production, prefer `tracing.env.existingSecret` so secret material is not supplied in Helm values or retained in Helm release metadata. Limit access to Secrets and Helm release records.

When upgrading from a chart that placed `AUTH_SECRET` directly in the Deployment, consider the old Deployment, ReplicaSets, exported manifests and deployment logs exposed to readers of those resources. If those readers were not authorized to possess the signing secret, rotate it and invalidate affected authentication artifacts as part of the upgrade. Moving the value into a Secret does not revoke earlier copies.

## Upgrading an existing Kaneo release

Back up and rehearse the upgrade against a restored database first. Retain the
Helm release name, namespace, existing resource names, PVC and database
credentials. For a chart that previously used the default `kaneo` name, set
`nameOverride: kaneo`; retain an existing `fullnameOverride` if one was used.
This preserves immutable selectors and the existing PostgreSQL resource names.
Move application settings from `kaneo:` to `tracing:` in your values file; do not
use the new PostgreSQL defaults for an already initialized volume. Keep the
existing `AUTH_SECRET`. Render the chart and compare names, selectors, PVCs and
secrets with the installed release before applying it. `/var/lib/kaneo` remains
the container's writable runtime path for compatibility.
