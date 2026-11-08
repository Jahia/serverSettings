package org.jahia.modules.serversettings.roles.graphql;

import org.jahia.modules.graphql.provider.dxm.DXGraphQLExtensionsProvider;
import org.osgi.service.component.annotations.Component;

/**
 * Publishes this bundle's GraphQL type extensions to the DXGraphQL provider.
 * <p>
 * The interface's default {@code getExtensions} scans this bundle for {@code @GraphQLTypeExtension}
 * classes, so an extension class needs no registration of its own.
 */
@Component(service = DXGraphQLExtensionsProvider.class, immediate = true)
public class GraphQLExtensionsProvider implements DXGraphQLExtensionsProvider {
}
