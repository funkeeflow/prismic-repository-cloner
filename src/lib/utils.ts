import env from "dotenv";

env.config();

export function getPrismicEndpoint(reproName: string) {
  return `https://${reproName}.prismic.io/api/v2`;
}

export function getAssetsEndpoint() {
  return `https://asset-api.prismic.io/assets`;
}

export function getCustomTypesEndpoint() {
  return `https://customtypes.prismic.io/customtypes`;
}

export function getMigrationEndpoint() {
  return `https://migration.prismic.io/documents`;
}

export async function wait(ms: number) {
  console.log(`Waiting ${ms}ms...`);
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchMasterRef(reproName: string) {
  if(!process.env.SOURCE_ACCESS_TOKEN) {
    throw new Error("SOURCE_ACCESS_TOKEN must be set in .env file");
  }

  const prismicEndpoint = getPrismicEndpoint(reproName);

  const response = await fetch(`${prismicEndpoint}`);

  if (!response.ok) {
    throw new Error(`fetchMasterRef(): Failed to fetch prismic repo: ${response.statusText} Reason: ${await response.text()}`);
  }
  const { refs } = await response.json();
  const masterRef = refs.find(ref => ref.id === 'master');
  if (!masterRef) {
    throw new Error("Master ref not found");
  }
  return masterRef;
}

export async function fetchLanguages() {
  const prismicEndpoint = getPrismicEndpoint(process.env.SOURCE_REPOSITORY_NAME);
  const response = await fetch(`${prismicEndpoint}`);

  if (!response.ok) {
    throw new Error(`fetchLanguages(): Failed to fetch prismic repo: ${response.statusText} Reason: ${await response.text()}`);
  }
  const { languages } = await response.json();
  return languages.map(language => language.id);
}
