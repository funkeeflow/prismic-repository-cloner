import fs from "fs";
import env from "dotenv";
import { updateDocument, uploadDocument } from "./lib/documents";
import { fetchLanguages, wait } from "./lib/utils";
import { checkIfCustomTypeAlreadyUploaded, uploadCustomType } from "./lib/custom-types";
import { uploadAsset } from "./lib/assets";
import { defaultLocale } from "./lib/constants";

env.config();

function getFileStructure() {
  const rootPathSrc = `./${process.env.OUT_DIR || "prismic-data"}/${process.env.SOURCE_REPOSITORY_NAME}`;
  if (!fs.existsSync(`${rootPathSrc}`)) {
    throw new Error("Source repo not cloned");
  }

  const rootPathDest = `./${process.env.OUT_DIR || "prismic-data"}/${process.env.DESTINATION_REPOSITORY_NAME}`;
  if (!fs.existsSync(`${rootPathDest}`)) {
    fs.mkdirSync(`${rootPathDest}`);
  }

  const destinationDocumentsPath = `${rootPathDest}/documents`;
  if (!fs.existsSync(destinationDocumentsPath)) {
    fs.mkdirSync(destinationDocumentsPath);
  }

  const assetsPath = `${rootPathSrc}/assets`;
  if (!fs.existsSync(assetsPath)) {
    throw new Error("Source repo not cloned, no assets found");
  }

  const customTypesPath = `${rootPathSrc}/custom-types`;
  if (!fs.existsSync(customTypesPath)) {
    throw new Error("Source repo not cloned, no custom types found");
  }

  const sourceDocumentsPath = `${rootPathSrc}/documents`;
  if (!fs.existsSync(sourceDocumentsPath)) {
    throw new Error("Source repo not cloned, no documents found");
  }

  const imageUploadMapPath = `${rootPathDest}/upload-map-images.json`;
  if (!fs.existsSync(imageUploadMapPath)) {
    throw new Error("Destination repo not cloned, no image upload map found");
  }

  const documentUploadMapPath = `${rootPathDest}/upload-map-documents.json`;
  if (!fs.existsSync(documentUploadMapPath)) {
    throw new Error("Destination repo not cloned, no document upload map found");
  }

  const documentMigrationMapPath = `${rootPathDest}/migration-map-documents.json`;
  if (!fs.existsSync(documentMigrationMapPath)) {
    throw new Error("Destination repo not cloned, no document migration map found");
  }

  return {
    assetsPath,
    customTypesPath,
    destinationDocumentsPath,
    sourceDocumentsPath,
    imageUploadMapPath,
    documentUploadMapPath,
    documentMigrationMapPath
  }
}

async function uploadAssets(assets: any[]) {
  const { assetsPath, imageUploadMapPath } = getFileStructure();
  const imageUploadMap = fs.existsSync(imageUploadMapPath) ? JSON.parse(fs.readFileSync(imageUploadMapPath, "utf8")) : {};
  for (const asset of assets) {
    const assetPath = `${assetsPath}/${asset}`;
    const assetId = asset.replace(".json", "");
    const isImageAlreadyUploaded = !!imageUploadMap[assetId];
    if (!isImageAlreadyUploaded) {
      const assetData = fs.readFileSync(`${assetPath}/${assetId}.json`, "utf8");
      const assetDataParsed = JSON.parse(assetData);
      const fileName = assetDataParsed.filename;
      const filePath = `${assetPath}/${fileName}`;
      const response = await uploadAsset(filePath, assetDataParsed);
      imageUploadMap[assetDataParsed.id] = response.id;
      fs.writeFileSync(imageUploadMapPath, JSON.stringify(imageUploadMap, null, 2));
      console.log(`Uploaded ${fileName} to ${response.id}`);
    } else {
      console.log(`Skipping ${assetId} because it is already uploaded`);
    }
  }
}

async function uploadCustomTypes(customTypes: any[]) {
  const { customTypesPath } = getFileStructure();
  for (const customType of customTypes) {
    const customTypeData = fs.readFileSync(`${customTypesPath}/${customType}`, "utf8");
    const customTypeDataParsed = JSON.parse(customTypeData);
    const isCustomTypeAlreadyUploaded = await checkIfCustomTypeAlreadyUploaded(customTypeDataParsed.id);
    if (!isCustomTypeAlreadyUploaded) {
      await uploadCustomType(customTypeDataParsed);
      console.log(`Uploaded ${customType}`);
    } else {
      console.log(`Skipping ${customType} because it is already uploaded`);
    }
  }
}

async function uploadAndSaveDocuments(sourceDocumentsPath: string, destinationDocumentsPath: string) {

  const { documentUploadMapPath, imageUploadMapPath } = getFileStructure();

  if (!process.env.SOURCE_REPOSITORY_NAME) {
    throw new Error("SOURCE_REPOSITORY_NAME must be set in .env file");
  }

  const languages = await fetchLanguages(process.env.SOURCE_REPOSITORY_NAME);

  const documentUploadMap = fs.existsSync(documentUploadMapPath) ? JSON.parse(fs.readFileSync(documentUploadMapPath, "utf8")) : {};
  const imageUploadMap = fs.existsSync(imageUploadMapPath) ? JSON.parse(fs.readFileSync(imageUploadMapPath, "utf8")) : {};

  for (const language of languages) {
    const sourceDocumentsPathLanguage = `${sourceDocumentsPath}/${language}`;
    const sourceDocuments = fs.readdirSync(sourceDocumentsPathLanguage);

    documentUploadMap[language] = documentUploadMap[language] || {};

    for (const document of sourceDocuments) {
      const documentData = fs.readFileSync(`${sourceDocumentsPathLanguage}/${document}`, "utf8");
      const documentDataParsed = JSON.parse(documentData);

      const isDocumentAlreadyUploaded = !!documentUploadMap[language][documentDataParsed.id];
      if (!isDocumentAlreadyUploaded) {

        /** Need title to upload with migration api */
        const oldDocumentWithTitle = {
          ...documentDataParsed,
          title: documentDataParsed?.data?.title || documentDataParsed?.data?.page_title || documentDataParsed?.data?.hero_title || documentDataParsed?.data?.content?.[0]?.text || documentDataParsed?.data?.name || "No Title"
        }

        /** Need to replace asset IDs or upload with migration api will fail
         * if it still fails, there might be a dangling asset in Prismic not downloaded during cloning
         * Fix: remove by hand form source document
         */
        let stringifiedDocument = JSON.stringify(oldDocumentWithTitle);
        for (const key in imageUploadMap) {
          // replace all image ids with the new image ids
          stringifiedDocument = stringifiedDocument.replace(new RegExp(key, 'g'), imageUploadMap[key]);
        }

        const documentToUpload = JSON.parse(stringifiedDocument);

        if (language !== defaultLocale) {
          const defaultLocaleDocumentId = documentDataParsed.alternate_languages.find(alt => alt.lang === defaultLocale)?.id
          if (defaultLocaleDocumentId) {
            documentToUpload.alternate_language_id = documentUploadMap[defaultLocale][defaultLocaleDocumentId];
            console.log(`language is not default locale, setting alternate_languages_id to ${documentToUpload.alternate_language_id}`);
          }
        }

        const { id: newDocumentId } = await uploadDocument(documentToUpload);
        console.log(`Uploaded ${document}`);

        documentUploadMap[language][documentToUpload.id] = newDocumentId;
        fs.writeFileSync(documentUploadMapPath, JSON.stringify(documentUploadMap, null, 2));
        fs.writeFileSync(`${destinationDocumentsPath}/${document}`, JSON.stringify(documentToUpload, null, 2));
        await wait(1000);
      } else {
        console.log(`Skipping ${document} because it is already uploaded`);
      }
    }
  }
}

async function migrateDocuments(documents: any[]) {

  if (!process.env.SOURCE_REPOSITORY_NAME) {
    throw new Error("SOURCE_REPOSITORY_NAME must be set in .env file");
  }

  const languages = await fetchLanguages(process.env.SOURCE_REPOSITORY_NAME);

  const { destinationDocumentsPath, documentUploadMapPath, documentMigrationMapPath } = getFileStructure();

  const documentUploadMap = fs.existsSync(documentUploadMapPath) ? JSON.parse(fs.readFileSync(documentUploadMapPath, "utf8")) : {};
  const documentMigrationMap = fs.existsSync(documentMigrationMapPath) ? JSON.parse(fs.readFileSync(documentMigrationMapPath, "utf8")) : {};

  for (const document of documents) {
    const documentData = fs.readFileSync(`${destinationDocumentsPath}/${document}`, "utf8");
    const documentDataParsed = JSON.parse(documentData);
    let stringifiedDocument = JSON.stringify(documentDataParsed);

    const isDocumentAlreadyMigrated = !!documentMigrationMap[documentDataParsed.id];

    if (!isDocumentAlreadyMigrated) {

      for (const language of languages) {
        for (const key in documentUploadMap[language]) {
          stringifiedDocument = stringifiedDocument.replace(new RegExp(key, 'g'), documentUploadMap[language][key]);
        }
      }

      const documentToUpload = JSON.parse(stringifiedDocument);
      await updateDocument(documentToUpload);

      fs.writeFileSync(`${destinationDocumentsPath}/${document}`, JSON.stringify(documentToUpload, null, 2));

      documentMigrationMap[documentToUpload.id] = new Date().toISOString();

      fs.writeFileSync(documentMigrationMapPath, JSON.stringify(documentMigrationMap, null, 2));

      console.log(`Updated ${document}`);
      await wait(1500);

    } else {
      console.log(`Skipping ${document} because it is already migrated`);
    }
  }
}

export async function createDestinationRepo() {

  const { assetsPath, customTypesPath, sourceDocumentsPath, destinationDocumentsPath } = getFileStructure();

  console.log("😬 Uploading assets...");
  const assets = fs.readdirSync(assetsPath);
  await uploadAssets(assets);

  console.log("🐙 Uploading custom types...");
  const customTypes = fs.readdirSync(customTypesPath);
  await uploadCustomTypes(customTypes);

  console.log(`🦜 Uploading documents...`);
  await uploadAndSaveDocuments(sourceDocumentsPath, destinationDocumentsPath);

  console.log(`🦦 Migrating documents...`);
  const destinationDocuments = fs.readdirSync(destinationDocumentsPath);
  await migrateDocuments(destinationDocuments);

  console.log(`🐧 All done!`);
}
