package org.jahia.modules.serversettings.roles.seed;

import java.io.File;
import java.io.FileInputStream;
import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Enumeration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import org.jahia.data.templates.JahiaTemplatesPackage;
import org.jahia.settings.SettingsBean;
import org.osgi.framework.Bundle;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * The role baseline the installed sources declare.
 * <p>
 * Two kinds of source are read, and both are read from what is installed rather than from a record of
 * what once happened. Jahia core ships a seed file in its own configuration directory, and every
 * module ships its seed inside the bundle. So the catalog answers one question: what would this
 * instance hold, for this core version and this exact set of modules, before anybody edited a role.
 * <p>
 * Reading the installed artifacts is what keeps the answer honest. A record of the original import
 * would drift the moment a module is upgraded, and core rewrites its own seed as its migration
 * scripts change what a role should hold.
 */
public final class RoleSeedCatalog {

    private static final Logger logger = LoggerFactory.getLogger(RoleSeedCatalog.class);

    private static final String CORE_SEED = "/repository/root-roles.xml";
    private static final String IMPORT_DIRECTORY = "META-INF";
    private static final String IMPORT_ARCHIVE_PATTERN = "import*.zip";
    private static final String ROLES_ENTRY = "roles.xml";

    /**
     * How much of one archive entry is read before the read is abandoned.
     * <p>
     * A roles.xml declares a handful of roles and is measured in kilobytes. The cap is here because
     * the size an archive entry declares is not the size it expands to, so a corrupt or hostile
     * bundle could otherwise hold the reader on one entry until the heap is gone. A refused entry
     * makes its source unreadable, and a reset then states the baseline is incomplete rather than
     * presenting a partial one as the whole.
     */
    private static final long MAX_ENTRY_BYTES = 8L * 1024 * 1024;

    private final Map<String, RoleSeed> seedsByName;
    private final List<RoleSeedSource> sources;
    private final List<String> unreadableSources;

    private RoleSeedCatalog(Map<String, RoleSeed> seedsByName, List<RoleSeedSource> sources,
                            List<String> unreadableSources) {
        this.seedsByName = seedsByName;
        this.sources = sources;
        this.unreadableSources = unreadableSources;
    }

    /**
     * Reads every seed of the running instance.
     *
     * @param modules the modules currently registered, whose bundles carry their own seed
     */
    public static RoleSeedCatalog read(Collection<JahiaTemplatesPackage> modules) {
        Map<String, RoleSeed> seeds = new LinkedHashMap<>();
        List<RoleSeedSource> sources = new ArrayList<>();
        List<String> unreadable = new ArrayList<>();

        RoleSeedReader reader;
        try {
            reader = new RoleSeedReader();
        } catch (Exception e) {
            logger.error("Cannot create the seed reader, so no baseline can be read", e);
            return new RoleSeedCatalog(seeds, sources, Collections.singletonList("the XML reader"));
        }

        readCore(reader, seeds, sources, unreadable);
        for (JahiaTemplatesPackage module : modules) {
            readModule(reader, module, seeds, sources, unreadable);
        }
        return new RoleSeedCatalog(seeds, sources, unreadable);
    }

    private static void readCore(RoleSeedReader reader, Map<String, RoleSeed> seeds,
                                 List<RoleSeedSource> sources, List<String> unreadable) {
        File file = new File(SettingsBean.getInstance().getJahiaEtcDiskPath() + CORE_SEED);
        if (!file.isFile()) {
            unreadable.add("Jahia core");
            return;
        }
        RoleSeedSource source = RoleSeedSource.core();
        try (InputStream stream = new FileInputStream(file)) {
            reader.read(stream, seeds, source);
            sources.add(source);
        } catch (Exception e) {
            logger.warn("Cannot read the core role seed at {}", file, e);
            unreadable.add("Jahia core");
        }
    }

    private static void readModule(RoleSeedReader reader, JahiaTemplatesPackage module, Map<String, RoleSeed> seeds,
                                   List<RoleSeedSource> sources, List<String> unreadable) {
        Bundle bundle = module.getBundle();
        if (bundle == null) {
            return;
        }
        Enumeration<URL> archives = bundle.findEntries(IMPORT_DIRECTORY, IMPORT_ARCHIVE_PATTERN, false);
        if (archives == null) {
            return;
        }
        RoleSeedSource source = RoleSeedSource.module(module.getId(), String.valueOf(module.getVersion()));
        boolean declared = false;
        boolean failed = false;
        while (archives.hasMoreElements()) {
            URL archive = archives.nextElement();
            try (ZipInputStream zip = new ZipInputStream(archive.openStream())) {
                ZipEntry entry;
                while ((entry = zip.getNextEntry()) != null) {
                    if (!ROLES_ENTRY.equals(entry.getName())) {
                        continue;
                    }
                    // The stream is handed to the reader without closing it, because closing it would
                    // close the archive under the loop that still has entries to walk.
                    reader.read(new BoundedEntryStream(zip, MAX_ENTRY_BYTES), seeds, source);
                    declared = true;
                }
            } catch (IOException | RuntimeException | org.xml.sax.SAXException e) {
                logger.warn("Cannot read the role seed of module {}", module.getId(), e);
                failed = true;
            }
        }
        if (declared) {
            sources.add(source);
        }
        if (failed) {
            unreadable.add(source.getLabel());
        }
    }

    /** The baseline of one role, or null when no installed source declares it. */
    public RoleSeed get(String roleName) {
        return seedsByName.get(roleName);
    }

    public boolean declares(String roleName) {
        return seedsByName.containsKey(roleName);
    }

    public Collection<RoleSeed> getSeeds() {
        return Collections.unmodifiableCollection(seedsByName.values());
    }

    /** Every source that declared at least one role. */
    public List<RoleSeedSource> getSources() {
        return Collections.unmodifiableList(sources);
    }

    /**
     * The sources that could not be read. A baseline built while one source is unreadable is
     * incomplete, so a reset states this rather than presenting a partial baseline as the whole one.
     */
    public List<String> getUnreadableSources() {
        return Collections.unmodifiableList(unreadableSources);
    }

    /**
     * One archive entry, read up to a limit and never closed.
     * <p>
     * Close is ignored because the archive owns the stream, and closing it would end the loop that
     * still has entries to walk. The limit bounds what one entry can make the reader hold.
     */
    private static final class BoundedEntryStream extends FilterInputStream {

        private final long limit;
        private long read;

        BoundedEntryStream(InputStream in, long limit) {
            super(in);
            this.limit = limit;
        }

        @Override
        public int read() throws IOException {
            int value = super.read();
            if (value != -1) {
                count(1);
            }
            return value;
        }

        @Override
        public int read(byte[] buffer, int offset, int length) throws IOException {
            int count = super.read(buffer, offset, length);
            if (count > 0) {
                count(count);
            }
            return count;
        }

        private void count(int bytes) throws IOException {
            read += bytes;
            if (read > limit) {
                throw new IOException("The archive entry is larger than the " + limit
                        + " bytes a role seed is read up to");
            }
        }

        @Override
        public void close() {
            // The archive owns the stream.
        }
    }
}
