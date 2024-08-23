import qs from 'qs';
import env from "dotenv";
import { getCustomTypesEndpoint } from './utils';
env.config();

if (!process.env.SOURCE_REPOSITORY_NAME || !process.env.DESTINATION_REPOSITORY_NAME) {
  throw new Error("SOURCE_REPOSITORY_NAME and DESTINATION_REPOSITORY_NAME must be set in .env file");
}

export async function fetchCustomTypes({ ref = "master", query = {} }) {

  const queryString = qs.stringify({
    ref,
    ...query
  });

  const customTypesEndpoint = getCustomTypesEndpoint();
  const response = await fetch(`${customTypesEndpoint}`, {
    headers: {
      'Authorization': 'Bearer ' + process.env.SOURCE_WRITE_API_TOKEN,
      'repository': process.env.SOURCE_REPOSITORY_NAME
    }
  });

  if (!response.ok) {
    throw new Error(`fetchCustomTypes(): Failed to fetch custom types: ${response.statusText}. Query: ${queryString}`);
  }

  return response.json();
}

export async function checkIfCustomTypeAlreadyUploaded(customTypeId: string) {
  const customTypesEndpoint = getCustomTypesEndpoint();
  const response = await fetch(`${customTypesEndpoint}/${customTypeId}`, {
    headers: {
      'Authorization': 'Bearer ' + process.env.DESTINATION_WRITE_API_TOKEN,
      'repository': process.env.DESTINATION_REPOSITORY_NAME
    }
  });
  if (!response.ok) {
    throw new Error(`checkIfCustomTypeAlreadyUploaded(): Failed to fetch custom types: ${response.statusText}.`);
  }
  const { id } = await response.json();
  if (id) {
    return true;
  }
  return false;
}

export async function uploadCustomType(customType) {
  const customTypesEndpoint = getCustomTypesEndpoint();
  const response = await fetch(`${customTypesEndpoint}/insert`, {
    headers: {
      'Authorization': 'Bearer ' + process.env.DESTINATION_WRITE_API_TOKEN,
      'repository': process.env.DESTINATION_REPOSITORY_NAME
    },
    method: 'POST',
    body: JSON.stringify(customType)
  });

  if (!response.ok) {
    throw new Error(`uploadCustomType(): Failed to upload custom type: ${response.statusText}.`);
  }

  return response.json();
}
