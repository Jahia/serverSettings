/**
 * Node-side task that builds a module jar holding nothing but its manifest.
 *
 * Jahia reads the display name of a module from the manifest headers `Implementation-Title` and
 * `Bundle-Name`, so a manifest-only OSGi bundle is enough to make a module with any name the spec
 * needs, without a Maven build. The jar is returned as a binary string, the form
 * `cy.runProvisioningScript` takes for a file part.
 *
 * The archive is written with the STORED method, so the only computation it needs is the CRC-32.
 */
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    return c >>> 0
})

const crc32 = (buffer) => {
    let crc = 0xffffffff
    for (const byte of buffer) {
        crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
    }
    return (crc ^ 0xffffffff) >>> 0
}

/** A manifest line is at most 72 bytes; a continuation line starts with one space. */
const wrapHeader = (line) => {
    let bytes = Buffer.from(line, 'utf8')
    const parts = [bytes.subarray(0, 72)]
    bytes = bytes.subarray(72)
    while (bytes.length > 0) {
        parts.push(Buffer.concat([Buffer.from(' '), bytes.subarray(0, 71)]))
        bytes = bytes.subarray(71)
    }
    return Buffer.concat(parts.flatMap((part, i) => (i === 0 ? [part] : [Buffer.from('\r\n'), part])))
}

const manifest = ({ symbolicName, name, moduleType }) => {
    const headers = [
        'Manifest-Version: 1.0',
        'Bundle-ManifestVersion: 2',
        `Bundle-SymbolicName: ${symbolicName}`,
        'Bundle-Version: 1.0.0',
        `Bundle-Name: ${name}`,
        `Implementation-Title: ${name}`,
        `Jahia-Module-Type: ${moduleType}`,
        'Jahia-GroupId: org.jahia.test',
        'Jahia-Depends: default',
        `Provide-Capability: com.jahia.modules.dependencies;moduleIdentifier="${symbolicName}";moduleVersion:Version=1.0.0`,
        'Require-Capability: com.jahia.modules.dependencies;filter:="(moduleIdentifier=default)"',
    ]
    const lines = headers.map(wrapHeader)
    return Buffer.concat([...lines.flatMap((line) => [line, Buffer.from('\r\n')]), Buffer.from('\r\n')])
}

const storedZip = (entryName, content) => {
    const name = Buffer.from(entryName, 'utf8')
    const crc = crc32(content)

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0x0800, 6) // UTF-8 names
    local.writeUInt16LE(0, 8) // STORED
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(content.length, 18)
    local.writeUInt32LE(content.length, 22)
    local.writeUInt16LE(name.length, 26)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0x0800, 8)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(content.length, 20)
    central.writeUInt32LE(content.length, 24)
    central.writeUInt16LE(name.length, 28)

    const centralOffset = local.length + name.length + content.length
    const end = Buffer.alloc(22)
    end.writeUInt32LE(0x06054b50, 0)
    end.writeUInt16LE(1, 8)
    end.writeUInt16LE(1, 10)
    end.writeUInt32LE(central.length + name.length, 12)
    end.writeUInt32LE(centralOffset, 16)

    return Buffer.concat([local, name, content, central, name, end])
}

/**
 * @param {{symbolicName: string, name: string, moduleType: 'module' | 'templatesSet'}} module
 * @returns {string} the jar, as a binary string
 */
const buildModuleJar = (module) => storedZip('META-INF/MANIFEST.MF', manifest(module)).toString('binary')

module.exports = { buildModuleJar }
