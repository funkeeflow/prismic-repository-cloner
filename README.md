# Prismic Repository Cloner

A tool for cloning Prismic repositories with use of the Migration API.

## Description

This project provides functionality to clone content from one Prismic repository to another, which is not possible in the free and medium plans. Be aware that the process might not be super smooth and might require some manual intervention.

## Features
- Transfer all Assets, Custom Types, Documents
- Rewire all linked documents to the new repository
- Rewire all linked assets to the new repository
- Rewire all translations to the new repository

## Installation

```bash
npm install
```

## Usage

### Configuration

Grab your API Access token and API Write token from the Repository you want to clone.

Then, you need to create your new repository in the Prismic dashboard. Grab the new repository name and your API Write token from the API section of the dashboard. You also need to get a demo token for the migration API.

Create a `.env` file (see `.env.example`) in the root of the project and add the following variables you just grabbed:

```bash
SOURCE_REPOSITORY_NAME=<your-source-repository-name>
SOURCE_ACCESS_TOKEN=<your-source-access-token>
SOURCE_WRITE_API_TOKEN=<your-source-write-api-token>

DESTINATION_REPOSITORY_NAME=<your-destination-repository-name>
DESTINATION_WRITE_API_TOKEN=<your-destination-write-api-token>
MIGRATION_DEMO_TOKEN=<your-migration-demo-token>

OUT_DIR=<your-output-directory> # default is ./prismic-data
```

### Run
Run the following command in the root of the project:

```bash
npm run migrate
```
The script will start the cloning process and then start uploading the assets to the new repository.

### Troubleshooting
If you get an error like this: `Error: Cannot find Asset with id ..`, you need to check if the asset is downloaded. It might happen that there are assets not available in the media library of the source repository, but that are still linked to the documents. Check the document ID in the error and find the corresponding document in the source repository in Prismic and replace the asset with one from the media library. Rerun the script and it should work.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details