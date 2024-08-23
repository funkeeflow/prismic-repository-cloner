import fs from "fs";
import env from "dotenv";

import { fetchPrismicDocuments } from "./lib/documents";
import { fetchLanguages, fetchMasterRef } from "./lib/utils";
import { fetchCustomTypes } from "./lib/custom-types";
import { downloadAsset, fetchAssets } from "./lib/assets";

env.config();

function getFileStructure() {

  if (!fs.existsSync(process.env.OUT_DIR || "prismic-data")) {
    fs.mkdirSync(process.env.OUT_DIR || "prismic-data");
  }
  const root = `${process.env.OUT_DIR || "prismic-data"}`
  const rootPathSrc = `./${root}/${process.env.SOURCE_REPOSITORY_NAME}`;
  const customTypesPath = `${rootPathSrc}/custom-types`;
  const sourceDocumentsPath = `${rootPathSrc}/documents`;
  const assetsPath = `${rootPathSrc}/assets`;

  if (!fs.existsSync(`${rootPathSrc}`)) {
    fs.mkdirSync(`${rootPathSrc}`);
  }

  if (!fs.existsSync(customTypesPath)) {
    fs.mkdirSync(customTypesPath);
  }

  if (!fs.existsSync(sourceDocumentsPath)) {
    fs.mkdirSync(sourceDocumentsPath);
  }

  if (!fs.existsSync(assetsPath)) {
    fs.mkdirSync(assetsPath);
  }

  return {
    customTypesPath,
    sourceDocumentsPath,
    assetsPath
  }
}

function savePrismicDocument(document: any, path: string) {
  const languagePath = `${path}/${document.lang}`;
  if (!fs.existsSync(languagePath)) {
    fs.mkdirSync(languagePath);
  }
  const documentPath = `${languagePath}/${document.id}.json`;
  fs.writeFileSync(documentPath, JSON.stringify(document, null, 2));
}

function savePrismicCustomType(type: any, path: string) {
  const typePath = `${path}/${type.id}.json`;
  fs.writeFileSync(typePath, JSON.stringify(type, null, 2));
}

async function savePrismicAsset(asset: any, path: string) {
  const currentAssetPath = `${path}/${asset.id}`;
  if (!fs.existsSync(`${currentAssetPath}`)) {
    fs.mkdirSync(currentAssetPath);
  }
  const assetPath = `${currentAssetPath}/${asset.id}.json`;
  fs.writeFileSync(assetPath, JSON.stringify(asset, null, 2));
  await downloadAsset(asset, currentAssetPath);
}

export async function cloneSourceRepo() {

  const { customTypesPath, sourceDocumentsPath, assetsPath } = getFileStructure();

  if (!process.env.SOURCE_REPOSITORY_NAME) {
    throw new Error("SOURCE_REPOSITORY_NAME must be set in .env file");
  }

  const masterRefSource = await fetchMasterRef(process.env.SOURCE_REPOSITORY_NAME);
  const languages = await fetchLanguages(process.env.SOURCE_REPOSITORY_NAME);

  console.log("Fetching assets...");
  const assets = await fetchAssets({ ref: masterRefSource.ref });
  for (const asset of assets) {
    await savePrismicAsset(asset, assetsPath);
  }

  console.log("Fetching custom types...");
  const types = await fetchCustomTypes({ ref: masterRefSource.ref });
  for (const type of types) {
    savePrismicCustomType(type, customTypesPath);
  }

  console.log("Fetching documents...");
  const documents = await fetchPrismicDocuments({ ref: masterRefSource.ref, languages });
  for (const document of documents) {
    savePrismicDocument(document, sourceDocumentsPath);
  }
}
