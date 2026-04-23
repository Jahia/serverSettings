/// <reference types="cypress" />
const fs = require('fs')
const path = require('path')
const yauzl = require('yauzl')

const parseProperties = content => {
    const result = {}
    content
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .forEach(line => {
            const separatorIndex = line.indexOf('=')
            if (separatorIndex > -1) {
                const key = line.substring(0, separatorIndex).trim()
                const value = line.substring(separatorIndex + 1).trim()
                result[key] = value
            }
        })
    return result
}

const extractSitePropertiesFromZipBuffer = zipBase64 =>
    new Promise((resolve, reject) => {
        const buffer = Buffer.from(zipBase64, 'base64')
        yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zipFile) => {
            if (err) {
                reject(err)
                return
            }

            let found = false
            zipFile.readEntry()
            zipFile.on('entry', entry => {
                if (entry.fileName.endsWith('site.properties')) {
                    found = true
                    zipFile.openReadStream(entry, (streamErr, stream) => {
                        if (streamErr) {
                            reject(streamErr)
                            return
                        }

                        const chunks = []
                        stream.on('data', chunk => chunks.push(chunk))
                        stream.on('end', () => {
                            zipFile.close()
                            resolve(parseProperties(Buffer.concat(chunks).toString('utf8')))
                        })
                        stream.on('error', reject)
                    })
                } else if (!found && entry.fileName.endsWith('.zip')) {
                    // Recurse into nested zip entries (e.g. outer export wrapper contains inner site zip)
                    zipFile.openReadStream(entry, (streamErr, stream) => {
                        if (streamErr) {
                            zipFile.readEntry()
                            return
                        }

                        const chunks = []
                        stream.on('data', chunk => chunks.push(chunk))
                        stream.on('end', () => {
                            const innerBase64 = Buffer.concat(chunks).toString('base64')
                            extractSitePropertiesFromZipBuffer(innerBase64).then(innerProps => {
                                if (Object.keys(innerProps).length > 0) {
                                    found = true
                                    zipFile.close()
                                    resolve(innerProps)
                                } else {
                                    zipFile.readEntry()
                                }
                            }).catch(() => zipFile.readEntry())
                        })
                        stream.on('error', () => zipFile.readEntry())
                    })
                } else {
                    zipFile.readEntry()
                }
            })

            zipFile.on('end', () => {
                if (!found) {
                    resolve({})
                }
            })

            zipFile.on('error', reject)
        })
    })
// ***********************************************************
// This example plugins/index.js can be used to load plugins
//
// You can change the location of this file or turn off loading
// the plugins file with the 'pluginsFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/plugins-guide
// ***********************************************************

// This function is called when a project is opened or re-opened (e.g. due to
// the project's config changing)

/**
 * @type {Cypress.PluginConfig}
 */
module.exports = (on, config) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('@jahia/cypress/dist/plugins/registerPlugins').registerPlugins(on, config)

    on('task', {
        extractSitePropertiesFromZipBuffer(zipBase64) {
            return extractSitePropertiesFromZipBuffer(zipBase64)
        },
        writeBinaryFile({ filePath, base64 }) {
            fs.mkdirSync(path.dirname(filePath), { recursive: true })
            fs.writeFileSync(filePath, Buffer.from(base64, 'base64'))
            return null
        },
    })

    const optionsPrinter = {
        // Logging to file to reduce verbosity in the CI platform
        outputRoot: config.projectRoot + '/results/logs/',
        outputTarget: {
            'cypress-logs|txt': 'txt',
        },
        printLogsToConsole: 'always',
        includeSuccessfulHookLogs: true,
        logToFilesOnAfterRun: true,
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('cypress-terminal-report/src/installLogsPrinter')(on, optionsPrinter)

    return config
}
