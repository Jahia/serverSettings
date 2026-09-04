package org.jahia.modules.serversettings.roles.graphql;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;

/**
 * The title and the description a role carries in one language.
 * <p>
 * The single-language {@code title} and {@code description} fields answer one language per call, so a
 * form that edits every language would need one field alias per language and would have to know the
 * language list before it builds the query. This type answers them all in one read.
 */
@GraphQLName("RoleText")
@GraphQLDescription("The title and the description a role carries in one language")
public class GqlRoleText {

    private final String language;
    private final String title;
    private final String description;

    public GqlRoleText(String language, String title, String description) {
        this.language = language;
        this.title = title;
        this.description = description;
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The language code")
    public String getLanguage() {
        return language;
    }

    @GraphQLField
    @GraphQLDescription("The jcr:title in this language, or null when the role has none")
    public String getTitle() {
        return title;
    }

    @GraphQLField
    @GraphQLDescription("The jcr:description in this language, or null when the role has none")
    public String getDescription() {
        return description;
    }
}
