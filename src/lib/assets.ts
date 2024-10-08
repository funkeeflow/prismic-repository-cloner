import * as fs from "fs";
import env from "dotenv";
import path from 'path';
import qs from 'qs';
import { Axios } from "axios";
import { getAssetsEndpoint } from './utils';

env.config();

export async function fetchAssets({ ref = "master", query = {} }) {

  const queryString = qs.stringify({
    ref,
    ...query,
    limit: 1000,
  });

  const assetsEndpoint = getAssetsEndpoint();

  if (!process.env.SOURCE_WRITE_API_TOKEN || !process.env.SOURCE_REPOSITORY_NAME) {
    throw new Error("SOURCE_WRITE_API_TOKEN and SOURCE_REPOSITORY_NAME must be set in .env file");
  }

  const response = await fetch(`${assetsEndpoint}?${queryString}`, {
    headers: {
      'Authorization': 'Bearer ' + process.env.SOURCE_WRITE_API_TOKEN,
      'repository': process.env.SOURCE_REPOSITORY_NAME
    }
  });

  if (!response.ok) {
    throw new Error(`fetchAssets(): Failed to fetch prismic repo: ${response.statusText}. Query: ${queryString}`);
  }

  const { items } = await response.json();
  return items;
}

export async function downloadAsset(asset: any, outputDir: string) {
  const response = await fetch(asset.url);

  if (!response.ok) {
    throw new Error(`downloadAsset(): Failed to fetch file: ${response.statusText}.`);
  }

  const filePath = path.join(outputDir, asset.filename);
  const fileStream = fs.createWriteStream(filePath);

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await new Promise((resolve, reject) => {
    fileStream.write(buffer, (error) => {
      if (error) {
        reject(error);
      } else {
        fileStream.end(resolve);
      }
    });
  });

  console.log(`Downloaded ${asset.filename} to ${filePath}`);
}

export async function uploadAsset(filePath: string, asset: any) {
  try {
    const stats = fs.statSync(filePath);
    const fileSizeInBytes = stats.size;
    const fileContent = fs.readFileSync(filePath);
    const file = new File([fileContent], path.basename(filePath), { type: 'application/octet-stream' });
    const formData = new FormData();
    formData.append("file", file);

    if (asset?.credits) {
      formData.append("credits", asset.credits);
    }
    if (asset?.notes) {
      formData.append("notes", asset.notes);
    }
    if (asset?.alt) {
      formData.append("alt", asset.alt);
    }
    const assetsEndpoint = getAssetsEndpoint();

    const client = new Axios({
      headers: {
        Authorization: `Bearer ${process.env.DESTINATION_WRITE_API_TOKEN}`,
        repository: `${process.env.DESTINATION_REPOSITORY_NAME}`
      },
    });

    const response = await client.request({
      method: "POST",
      data: formData,
      url: `${assetsEndpoint}`,
    });

    return JSON.parse(response.data);
  } catch (error) {
    console.log(error);
  }
}

export async function checkIfImageAlreadyUploaded(id: string) {
  const assetsEndpoint = getAssetsEndpoint();

  if (!process.env.DESTINATION_WRITE_API_TOKEN || !process.env.DESTINATION_REPOSITORY_NAME) {
    throw new Error("DESTINATION_WRITE_API_TOKEN and DESTINATION_REPOSITORY_NAME must be set in .env file");
  }

  const response = await fetch(`${assetsEndpoint}?id=${id}&limit=1`, {
    headers: {
      'Authorization': 'Bearer ' + process.env.DESTINATION_WRITE_API_TOKEN,
      'repository': process.env.DESTINATION_REPOSITORY_NAME
    }
  });

  if (!response.ok) {
    throw new Error(`checkIfImageAlreadyUploaded(): Failed to fetch prismic repo: ${response.statusText}.`);
  }

  const { total, items } = await response.json();
  console.log(items);
  if (total > 0) {
    return true;
  }
  return false;
}
