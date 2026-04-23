export interface TaggedTestMeta {
    id: string
    tags: string[]
}

const toTestConfig = (meta: TaggedTestMeta): Cypress.TestConfigOverrides => ({
    env: {
        testCaseId: meta.id,
        testTags: meta.tags,
    },
})

export const describeWithTags = (title: string, meta: TaggedTestMeta, suite: () => void) => {
    describe(title, toTestConfig(meta), suite)
}

export const itWithTags = (title: string, meta: TaggedTestMeta, testBody: () => void) => {
    it(title, toTestConfig(meta), testBody)
}
