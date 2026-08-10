/**
 * Node-side tasks for the site export/import specs.
 *
 * A site export is downloaded by the browser, so the assertions about the produced file (it exists,
 * it is non-empty, its site.properties holds the right server names) cannot run in the browser: they
 * need the filesystem. Hence these two tasks.
 *
 * The exported archive nests one zip per site inside the download, so reading site.properties means
 * opening a zip inside a zip. `yauzl` does that from a buffer without unpacking to disk.
 */
const fs = require('fs')
const path = require('path')
const yauzl = require('yauzl')

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const matchingArchives = (dir, prefix) =>
    fs
        .readdirSync(dir)
        .filter((name) => name.startsWith(prefix) && name.endsWith('.zip'))
        .map((name) => {
            const filePath = path.join(dir, name)
            const stats = fs.statSync(filePath)
            return { name, path: filePath, size: stats.size, mtimeMs: stats.mtimeMs }
        })
        .sort((a, b) => b.mtimeMs - a.mtimeMs)

/**
 * Newest `<prefix>*.zip` in `dir`, waiting for the browser to finish writing it.
 *
 * The polling lives here on purpose: `cy.task` is a command, not a query, so a trailing
 * `.should('not.be.null')` would NOT re-run it — the single call would land before the download
 * exists and report "no archive" for a working export. Waiting inside the task is what makes the
 * assertion meaningful.
 *
 * A stable size across two polls is the completion signal: a partially written archive keeps growing.
 */
const findDownloadedArchive = async ({ dir, prefix, timeoutMs = 60000 }) => {
    const deadline = Date.now() + timeoutMs
    let previousSize = -1
    while (Date.now() < deadline) {
        const [newest] = matchingArchives(dir, prefix)
        if (newest && newest.size > 0 && newest.size === previousSize) {
            return { name: newest.name, path: newest.path, size: newest.size }
        }
        previousSize = newest ? newest.size : -1
        await sleep(500)
    }
    throw new Error(`no ${prefix}*.zip appeared in ${dir} within ${timeoutMs}ms`)
}

const readEntry = (zipFile, entry) =>
    new Promise((resolve, reject) => {
        zipFile.openReadStream(entry, (err, stream) => {
            if (err) {
                reject(err)
                return
            }
            const chunks = []
            stream.on('data', (chunk) => chunks.push(chunk))
            stream.on('end', () => resolve(Buffer.concat(chunks)))
            stream.on('error', reject)
        })
    })

/**
 * Reads one entry by exact name; resolves null when the archive has no such entry.
 *
 * Resolves as soon as the entry's bytes are in hand rather than waiting for a `close` event: with
 * `lazyEntries`, whether `end`/`close` fires after an interrupted iteration depends on how the zip
 * was opened (file vs buffer), and waiting on it hangs the task instead of failing it.
 */
const extractEntry = (open, entryName) =>
    new Promise((resolve, reject) => {
        open((err, zipFile) => {
            if (err) {
                reject(err)
                return
            }
            let settled = false
            const finish = (value) => {
                if (!settled) {
                    settled = true
                    resolve(value)
                }
            }
            zipFile.on('entry', (entry) => {
                if (entry.fileName !== entryName) {
                    zipFile.readEntry()
                    return
                }
                readEntry(zipFile, entry).then((buffer) => {
                    finish(buffer)
                    zipFile.close()
                }, reject)
            })
            zipFile.on('end', () => finish(null))
            zipFile.on('close', () => finish(null))
            zipFile.on('error', reject)
            zipFile.readEntry()
        })
    })

const parseProperties = (text) =>
    text.split('\n').reduce((properties, rawLine) => {
        const line = rawLine.trim()
        if (!line || line.startsWith('#')) {
            return properties
        }
        const separator = line.indexOf('=')
        if (separator === -1) {
            return properties
        }
        properties[line.slice(0, separator).trim()] = line.slice(separator + 1).trim()
        return properties
    }, {})

/**
 * Returns the site.properties of `siteKey` inside an exported archive, as a plain object.
 * Throws when either the per-site zip or its site.properties is missing — a silent null here would
 * turn a broken export into a passing test.
 */
const readExportedSiteProperties = async ({ archivePath, siteKey }) => {
    const siteZip = await extractEntry(
        (callback) => yauzl.open(archivePath, { lazyEntries: true }, callback),
        `${siteKey}.zip`,
    )
    if (!siteZip) {
        throw new Error(`${archivePath} contains no ${siteKey}.zip entry`)
    }
    const properties = await extractEntry(
        (callback) => yauzl.fromBuffer(siteZip, { lazyEntries: true }, callback),
        'site.properties',
    )
    if (!properties) {
        throw new Error(`${siteKey}.zip contains no site.properties entry`)
    }
    return parseProperties(properties.toString('utf8'))
}

module.exports = { findDownloadedArchive, readExportedSiteProperties }
