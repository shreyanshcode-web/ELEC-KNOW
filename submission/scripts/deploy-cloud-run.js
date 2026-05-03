#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const GCLOUD = process.platform === 'win32' ? 'gcloud.cmd' : 'gcloud';
const GIT = process.platform === 'win32' ? 'git.cmd' : 'git';
const rootDir = process.cwd();

const log = (message = '') => console.log(message);
const fail = (message, code = 1) => {
  console.error(`\nCloud Run deploy failed: ${message}`);
  process.exit(code);
};

const parseArgs = (argv) => {
  const parsed = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;

    const withoutPrefix = arg.slice(2);
    if (withoutPrefix.startsWith('no-')) {
      parsed[withoutPrefix] = true;
      continue;
    }

    const [key, inlineValue] = withoutPrefix.split('=', 2);
    if (inlineValue !== undefined) {
      parsed[key] = inlineValue;
      continue;
    }

    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      parsed[key] = next;
      i += 1;
    } else {
      parsed[key] = true;
    }
  }

  return parsed;
};

const printHelp = () => {
  log(`Usage: npm run deploy:cloud-run -- [options]

Options:
  --project PROJECT_ID          Google Cloud project (or GCP_PROJECT_ID)
  --region REGION              Cloud Run region (default: us-central1)
  --service NAME               Cloud Run service name
  --cloud-sql CONNECTION_NAME   Attach a Cloud SQL instance
  --vpc-connector CONNECTOR    Attach a VPC connector for private Redis
  --no-allow-unauthenticated   Require authenticated invocations

Secrets:
  GEMINI_API_KEY, DATAGOV_API_KEY, VERIFIK_API_TOKEN, DATABASE_URL,
  DB_PASSWORD, and REDIS_PASSWORD are uploaded to Google Secret Manager
  when present locally, then injected into Cloud Run with --set-secrets.`);
};

const stripQuotes = (value) => {
  if (!value) return value;
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const normalized = line.startsWith('export ') ? line.slice(7).trim() : line;
    const equalsIndex = normalized.indexOf('=');
    if (equalsIndex === -1) continue;

    const key = normalized.slice(0, equalsIndex).trim();
    const value = stripQuotes(normalized.slice(equalsIndex + 1));

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
};

const isPlaceholder = (value) => {
  if (typeof value !== 'string' || !value) return true;
  const normalized = value.trim().toLowerCase();
  return [
    'your-gcp-project-id',
    'your_gcp_project_id',
    'your_gemini_api_key_here',
    'your_datagov_api_key_here',
    'your_verifik_jwt_token_here',
    'changeme',
    'change-me',
    'todo',
  ].includes(normalized) || normalized.startsWith('your_') || normalized.startsWith('your-');
};

const isLocalValue = (value) => {
  if (!value) return false;
  return /localhost|127\.0\.0\.1|postgres:5432|redis:6379|kafka:9092/i.test(value);
};

const validConfig = (value) => typeof value === 'string' && Boolean(value.trim()) && !isPlaceholder(value);
const validSecretValue = (value) => validConfig(value) && value !== 'election_pass' && !isLocalValue(value);

const commandLabel = (command, args) => [command, ...args].join(' ');

const run = (command, args, options = {}) => {
  if (options.quiet !== true) {
    log(`\n$ ${commandLabel(command, args)}`);
  }

  const result = spawnSync(command, args, {
    cwd: options.cwd || rootDir,
    input: options.input,
    shell: false,
    stdio: options.stdio || 'inherit',
    windowsHide: true,
  });

  if (result.error) {
    fail(`Could not run "${command}". Is it installed and available on PATH?`);
  }

  if (result.status !== 0) {
    fail(`Command exited with status ${result.status}: ${commandLabel(command, args)}`, result.status || 1);
  }

  return result;
};

const capture = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: options.cwd || rootDir,
    shell: false,
    stdio: ['ignore', 'pipe', options.showErrors ? 'inherit' : 'ignore'],
    encoding: 'utf8',
    windowsHide: true,
  });

  return {
    ok: !result.error && result.status === 0,
    stdout: result.stdout?.trim() || '',
    status: result.status,
  };
};

const succeeds = (command, args) => {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    shell: false,
    stdio: 'ignore',
    windowsHide: true,
  });

  return !result.error && result.status === 0;
};

const firstValid = (...values) => values.find(validConfig);

const currentGcloudProject = () => {
  const result = capture(GCLOUD, ['config', 'get-value', 'project', '--quiet']);
  return result.ok ? result.stdout : '';
};

const gitShortSha = () => {
  const result = capture(GIT, ['rev-parse', '--short', 'HEAD']);
  return result.ok && result.stdout ? result.stdout : '';
};

const timestampTag = () => new Date()
  .toISOString()
  .replace(/[-:]/g, '')
  .replace(/\..+/, 'Z');

const ensureArtifactRepository = ({ projectId, region, repository }) => {
  const describeArgs = [
    'artifacts',
    'repositories',
    'describe',
    repository,
    '--location',
    region,
    '--project',
    projectId,
  ];

  if (succeeds(GCLOUD, describeArgs)) {
    log(`Artifact Registry repository ready: ${repository}`);
    return;
  }

  run(GCLOUD, [
    'artifacts',
    'repositories',
    'create',
    repository,
    '--repository-format',
    'docker',
    '--location',
    region,
    '--description',
    'Election Education containers',
    '--project',
    projectId,
    '--quiet',
  ]);
};

const ensureServiceAccount = ({ projectId, accountName }) => {
  const providedEmail = firstValid(process.env.CLOUD_RUN_SERVICE_ACCOUNT_EMAIL);
  if (providedEmail) {
    log(`Using Cloud Run service account: ${providedEmail}`);
    return providedEmail;
  }

  const email = `${accountName}@${projectId}.iam.gserviceaccount.com`;
  if (!succeeds(GCLOUD, [
    'iam',
    'service-accounts',
    'describe',
    email,
    '--project',
    projectId,
  ])) {
    run(GCLOUD, [
      'iam',
      'service-accounts',
      'create',
      accountName,
      '--display-name',
      'Election Education Cloud Run',
      '--project',
      projectId,
      '--quiet',
    ]);
  } else {
    log(`Cloud Run service account ready: ${email}`);
  }

  for (const role of ['roles/secretmanager.secretAccessor', 'roles/cloudsql.client']) {
    run(GCLOUD, [
      'projects',
      'add-iam-policy-binding',
      projectId,
      '--member',
      `serviceAccount:${email}`,
      '--role',
      role,
      '--quiet',
    ]);
  }

  return email;
};

const secretExists = (projectId, secretName) => succeeds(GCLOUD, [
  'secrets',
  'describe',
  secretName,
  '--project',
  projectId,
]);

const secretHasEnabledVersion = (projectId, secretName) => {
  const result = capture(GCLOUD, [
    'secrets',
    'versions',
    'list',
    secretName,
    '--filter',
    'state:enabled',
    '--limit',
    '1',
    '--format',
    'value(name)',
    '--project',
    projectId,
  ]);

  return result.ok && Boolean(result.stdout);
};

const ensureSecretFromEnv = ({ projectId, envKey, secretName, required = false }) => {
  const value = process.env[envKey];
  const canUpload = validSecretValue(value);

  if (!canUpload) {
    if (secretHasEnabledVersion(projectId, secretName)) {
      log(`Secret ready: ${secretName}`);
      return true;
    }

    if (required) {
      fail(`Set ${envKey} in submission/.env or create Secret Manager secret "${secretName}" with an enabled version.`);
    }

    return false;
  }

  if (!secretExists(projectId, secretName)) {
    run(GCLOUD, [
      'secrets',
      'create',
      secretName,
      '--replication-policy',
      'automatic',
      '--project',
      projectId,
      '--quiet',
    ]);
  }

  run(GCLOUD, [
    'secrets',
    'versions',
    'add',
    secretName,
    '--data-file=-',
    '--project',
    projectId,
  ], {
    input: value,
    stdio: ['pipe', 'inherit', 'inherit'],
  });

  return true;
};

const addEnvVar = (envVars, key, value) => {
  if (validConfig(value)) {
    envVars[key] = value;
  }
};

const serializeMap = (values) => Object
  .entries(values)
  .map(([key, value]) => `${key}=${value}`)
  .join(',');

const main = () => {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  loadEnvFile(path.join(rootDir, '.env.cloudrun'));
  loadEnvFile(path.join(rootDir, '.env'));

  const projectId = firstValid(
    args.project,
    args['project-id'],
    process.env.GCP_PROJECT_ID,
    process.env.GOOGLE_CLOUD_PROJECT,
    currentGcloudProject(),
  );

  if (!projectId) {
    fail('Set GCP_PROJECT_ID, pass --project YOUR_PROJECT, or run "gcloud config set project YOUR_PROJECT".');
  }

  const region = firstValid(args.region, process.env.GCP_REGION, process.env.GOOGLE_CLOUD_REGION) || 'us-central1';
  const service = firstValid(args.service, process.env.CLOUD_RUN_SERVICE) || 'election-education-api';
  const repository = firstValid(args.repository, process.env.ARTIFACT_REPOSITORY) || 'election-registry';
  const imageName = firstValid(args.image, process.env.CLOUD_RUN_IMAGE_NAME) || 'election-api';
  const accountName = firstValid(args['service-account'], process.env.CLOUD_RUN_SERVICE_ACCOUNT) || 'election-cloud-run';
  const imageTag = firstValid(args.tag, process.env.IMAGE_TAG, gitShortSha()) || timestampTag();
  const imageUri = `${region}-docker.pkg.dev/${projectId}/${repository}/${imageName}:${imageTag}`;
  const allowUnauthenticated = !args['no-allow-unauthenticated'];

  log('Cloud Run deployment');
  log(`Project: ${projectId}`);
  log(`Region: ${region}`);
  log(`Service: ${service}`);
  log(`Image: ${imageUri}`);

  run(GCLOUD, ['config', 'set', 'project', projectId, '--quiet']);
  run(GCLOUD, [
    'services',
    'enable',
    'run.googleapis.com',
    'cloudbuild.googleapis.com',
    'artifactregistry.googleapis.com',
    'secretmanager.googleapis.com',
    'iam.googleapis.com',
    'sqladmin.googleapis.com',
    '--project',
    projectId,
    '--quiet',
  ]);

  ensureArtifactRepository({ projectId, region, repository });
  const serviceAccountEmail = ensureServiceAccount({ projectId, accountName });

  const secretEnvVars = {};
  if (ensureSecretFromEnv({
    projectId,
    envKey: 'GEMINI_API_KEY',
    secretName: 'gemini-api-key',
    required: true,
  })) {
    secretEnvVars.GEMINI_API_KEY = 'gemini-api-key:latest';
  }

  const optionalSecrets = [
    ['DATABASE_URL', 'database-url'],
    ['DB_PASSWORD', 'db-password'],
    ['DATAGOV_API_KEY', 'datagov-api-key'],
    ['VERIFIK_API_TOKEN', 'verifik-api-token'],
    ['REDIS_PASSWORD', 'redis-password'],
  ];

  for (const [envKey, secretName] of optionalSecrets) {
    if (ensureSecretFromEnv({ projectId, envKey, secretName })) {
      secretEnvVars[envKey] = `${secretName}:latest`;
    }
  }

  run(GCLOUD, [
    'builds',
    'submit',
    '.',
    '--config',
    'cloudbuild.cloudrun.yaml',
    '--substitutions',
    `_IMAGE_URI=${imageUri}`,
    '--project',
    projectId,
  ]);

  const envVars = {
    NODE_ENV: 'production',
    KAFKA_ENABLED: firstValid(process.env.CLOUD_RUN_KAFKA_ENABLED) || 'false',
    GOOGLE_CLOUD_PROJECT: projectId,
    GCP_PROJECT_ID: projectId,
  };

  const cloudSqlConnection = firstValid(args['cloud-sql'], process.env.CLOUD_SQL_CONNECTION_NAME);
  if (cloudSqlConnection) {
    envVars.CLOUD_SQL_CONNECTION_NAME = cloudSqlConnection;
    addEnvVar(envVars, 'DB_NAME', process.env.DB_NAME || 'election_education');
    addEnvVar(envVars, 'DB_USER', process.env.DB_USER || 'election_user');
  }

  addEnvVar(envVars, 'REDIS_HOST', process.env.REDIS_HOST && !isLocalValue(process.env.REDIS_HOST) ? process.env.REDIS_HOST : '');
  addEnvVar(envVars, 'REDIS_PORT', process.env.REDIS_PORT);
  addEnvVar(envVars, 'DATAGOV_BASE_URL', process.env.DATAGOV_BASE_URL);
  addEnvVar(envVars, 'ECI_BASE_URL', process.env.ECI_BASE_URL);
  addEnvVar(envVars, 'VERIFIK_BASE_URL', process.env.VERIFIK_BASE_URL);

  const deployArgs = [
    'run',
    'deploy',
    service,
    '--image',
    imageUri,
    '--platform',
    'managed',
    '--region',
    region,
    '--port',
    '8080',
    '--service-account',
    serviceAccountEmail,
    '--set-env-vars',
    serializeMap(envVars),
    '--project',
    projectId,
    '--quiet',
  ];

  if (Object.keys(secretEnvVars).length > 0) {
    deployArgs.push('--set-secrets', serializeMap(secretEnvVars));
  }

  if (allowUnauthenticated) {
    deployArgs.push('--allow-unauthenticated');
  } else {
    deployArgs.push('--no-allow-unauthenticated');
  }

  if (cloudSqlConnection) {
    deployArgs.push('--add-cloudsql-instances', cloudSqlConnection);
  }

  const vpcConnector = firstValid(args['vpc-connector'], process.env.VPC_CONNECTOR);
  if (vpcConnector) {
    deployArgs.push('--vpc-connector', vpcConnector, '--vpc-egress', process.env.VPC_EGRESS || 'private-ranges-only');
  }

  run(GCLOUD, deployArgs);

  const serviceUrl = capture(GCLOUD, [
    'run',
    'services',
    'describe',
    service,
    '--region',
    region,
    '--project',
    projectId,
    '--format',
    'value(status.url)',
  ]);

  log('\nCloud Run deploy complete.');
  if (serviceUrl.ok && serviceUrl.stdout) {
    log(`URL: ${serviceUrl.stdout}`);
    log(`Health: ${serviceUrl.stdout}/health`);
  }
};

main();
