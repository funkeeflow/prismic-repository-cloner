import qs from 'qs';
import env from "dotenv";
import { getMigrationEndpoint, getPrismicEndpoint } from './utils';
env.config();

if(!process.env.SOURCE_REPOSITORY_NAME || !process.env.DESTINATION_REPOSITORY_NAME) {
  throw new Error("SOURCE_REPOSITORY_NAME and DESTINATION_REPOSITORY_NAME must be set in .env file");
}

export async function fetchPrismicDocuments({ ref = "master", languages, query = {} }) {
  const documents = [];

  for (const language of languages) {

    const queryString = qs.stringify({
      ref,
      access_token: process.env.SOURCE_ACCESS_TOKEN,
      ...query,
      lang: language,
      pageSize: 100
    });

    const prismicEndpoint = getPrismicEndpoint(process.env.SOURCE_REPOSITORY_NAME);
    const response = await fetch(`${prismicEndpoint}/documents/search?${queryString}`);

    if (!response.ok) {
      throw new Error(`prismicFetch(): Failed to fetch prismic repo: ${response.statusText}. Query: ${queryString}`);
    }

    const { results: firstPageResults, total_pages } = await response.json();

    documents.push(...firstPageResults);

    if (total_pages > 1) {
      for (let i = 2; i <= total_pages; i++) {
        const response = await fetch(`${prismicEndpoint}/documents/search?${queryString}&page=${i}`);
        if (!response.ok) {
          throw new Error(`prismicFetch(): Failed to fetch prismic repo: ${response.statusText}. Query: ${queryString}`);
        }
        const { results: pagedResults } = await response.json();
        documents.push(...pagedResults);
      }
    }
  }

  return documents;
}

export async function uploadDocument(document) {
  const migrationEndpoint = getMigrationEndpoint();
  const response = await fetch(`${migrationEndpoint}`, {
    headers: {
      'Authorization': 'Bearer ' + process.env.DESTINATION_WRITE_API_TOKEN,
      'repository': process.env.DESTINATION_REPOSITORY_NAME,
      'x-api-key': process.env.MIGRATION_DEMO_TOKEN
    },
    method: 'POST',
    body: JSON.stringify(document)
  });

  if (!response.ok) {
    throw new Error(`uploadDocument(): Failed to upload document ${document.id}: ${response.statusText} Reason: ${await response.text()}.`);
  }

  return response.json();
}

export async function updateDocument(document) {
  const migrationEndpoint = getMigrationEndpoint();
  const response = await fetch(`${migrationEndpoint}/${document.id}`, {
    headers: {
      'Authorization': 'Bearer ' + process.env.DESTINATION_WRITE_API_TOKEN,
      'repository': process.env.DESTINATION_REPOSITORY_NAME,
      'x-api-key': process.env.MIGRATION_DEMO_TOKEN
    },
    method: 'PUT',
    body: JSON.stringify(document)
  });

  if (!response.ok) {
    throw new Error(`updateDocument(): Failed to update document ${document.id}: ${response.statusText} Reason: ${await response.text()}.`);
  }

  return response.json();
}
