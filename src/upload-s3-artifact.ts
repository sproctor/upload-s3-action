import * as core from '@actions/core'
import S3 from 'aws-sdk/clients/s3'
import {findFilesToUpload} from './search'
import {createReadStream} from 'fs'
import {basename, join, relative} from 'path'
import {lookup} from 'mime-types'

const AWS_KEY_ID = core.getInput('aws-key-id', {
  required: true
})
const SECRET_ACCESS_KEY = core.getInput('aws-secret-access-key', {
  required: true
})
const BUCKET = core.getInput('aws-bucket', {
  required: true
})
const PATH = core.getInput('path', {
  required: true
})
const DESTINATION_PATH = core.getInput('destination-path', {
  required: false
})
const USE_RELATIVE_PATH = core.getBooleanInput('use-relative-path', {
  required: false
})

const s3 = new S3({
  accessKeyId: AWS_KEY_ID,
  secretAccessKey: SECRET_ACCESS_KEY
});

async function upload(file: string, rootDirectory: string): Promise<void> {
  return new Promise(resolve => {
    const fileStream = createReadStream(file)
    const bucketPath = join(
      DESTINATION_PATH,
      USE_RELATIVE_PATH ? relative(rootDirectory, file) : basename(file)
    ).replace(/\\/g, '/').normalize()
    core.debug(`bucket path: ${bucketPath}`)
    const params = {
      Bucket: BUCKET,
      ACL: 'public-read',
      Body: fileStream,
      Key: bucketPath,
      ContentType: lookup(file) || 'text/plain'
    }
    s3.upload(params, (err, data) => {
      if (err) core.error(err)
      core.info(`uploaded - ${data.Key} to ${data.Location}`)
      resolve(data.Location)
    })
  })
}

async function run(): Promise<void> {
  try {
    core.debug(`use-relative-path: ${USE_RELATIVE_PATH}`)
    core.debug(`path: ${PATH}`)
    core.debug(`destination path: ${DESTINATION_PATH}`)
    const searchResult = await findFilesToUpload(PATH)
    if (searchResult.filesToUpload.length === 0) {
      core.setFailed(
        `No files were found with the provided path: ${PATH}. No artifacts will be uploaded.`
      )
    }
    core.info(
      `With the provided path, there will be ${searchResult.filesToUpload.length} file(s) uploaded`
    )
    core.debug(`Root artifact directory is ${searchResult.rootDirectory}`)

    if (searchResult.filesToUpload.length > 10000) {
      core.warning(
        `There are over 10,000 files in this artifact, consider creating an archive before upload to improve the upload performance.`
      )
    }

    for (const file of searchResult.filesToUpload) {
      await upload(file, searchResult.rootDirectory)
    }
  }  catch (err) {
    core.setFailed((err as Error).message)
  }
}

run()
