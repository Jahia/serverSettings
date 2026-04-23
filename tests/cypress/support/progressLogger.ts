export interface ProgressContext {
    testCaseId: string
    scope: string
    logFileName?: string
}

export const logTestProgress = (context: ProgressContext, message: string) => {
    const line = `[${context.testCaseId}][${context.scope}] ${message}`
    const logFile = context.logFileName ?? `${context.testCaseId.toLowerCase()}-progress.log`
    cy.log(line)
    cy.writeFile(`results/reports/${logFile}`, `${line}\n`, { flag: 'a+' })
}
