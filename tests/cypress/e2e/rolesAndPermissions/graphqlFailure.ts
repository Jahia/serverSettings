/**
 * Refuse one GraphQL operation, so a screen's error path can be exercised.
 *
 * The refusals this simulates are all reachable on a real instance: a role deleted from another
 * session, a write the repository turns down, a revision that moved. None of them is reachable from a
 * test on demand, and each one is a branch that rendered nothing at all before it was fixed, so the
 * refusal is what makes the branch testable.
 *
 * The request is ANSWERED here and never forwarded. Rewriting the real answer instead would let the
 * write land while the screen was told it had not, so an assertion that the repository did not change
 * would pass for the wrong reason. A refusal has to refuse.
 *
 * That only holds for an operation sent on its own, so a batch carrying anything else is forwarded
 * untouched and the caller sees the real answer. Every operation used here is what one click sends.
 */

const GRAPHQL = { method: 'POST', url: '/modules/graphql' }

/** The operation is refused and never reaches the repository. */
export const refuse = (operationName: string, message: string, alias = 'refused') => {
    cy.intercept(GRAPHQL, (req) => {
        const operations = Array.isArray(req.body) ? req.body : [req.body]
        if (operations.length !== 1 || operations[0]?.operationName !== operationName) {
            return
        }

        const answer = { errors: [{ message }], data: null }
        req.reply({ statusCode: 200, body: Array.isArray(req.body) ? [answer] : answer })
    }).as(alias)
}
