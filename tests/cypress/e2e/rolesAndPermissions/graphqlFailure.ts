/**
 * Force one GraphQL operation to fail, so a screen's error path can be exercised.
 *
 * The refusals these helpers simulate are all reachable on a real instance: a role deleted from
 * another session, a permission revoked while the plan was on screen, a write refused by the
 * repository. None of them is reachable from a test on demand, and each one is a branch that
 * rendered nothing at all before it was fixed, so the interception is what makes the branch testable.
 *
 * The client batches, so a request body is an array of operations and the response body is an array
 * of answers at the same indexes. A single-operation body is handled too, because whether the client
 * batches a given call is not something a spec should depend on.
 */

const GRAPHQL = { method: 'POST', url: '/modules/graphql' }

type Answer = Record<string, unknown>

/** Replace the answer to `operationName` with whatever `answer` returns. */
const replaceAnswer = (operationName: string, answer: () => Answer, alias: string) => {
    cy.intercept(GRAPHQL, (req) => {
        req.continue((res) => {
            const operations = Array.isArray(req.body) ? req.body : [req.body]
            const matches = operations.some((operation) => operation?.operationName === operationName)
            if (!matches) {
                return
            }

            if (Array.isArray(res.body)) {
                res.body = res.body.map((original: Answer, index: number) =>
                    operations[index]?.operationName === operationName ? answer() : original,
                )
            } else {
                res.body = answer()
            }
        })
    }).as(alias)
}

/** The operation is refused, the way a repository refusal reaches the client. */
export const refuse = (operationName: string, message: string, alias = 'refused') =>
    replaceAnswer(operationName, () => ({ errors: [{ message }], data: null }), alias)
