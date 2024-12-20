import { BackgroundJobsPage } from '../page-object/BackgroundJobsPage'

describe('Background Jobs Page Test', () => {
    beforeEach(() => {
        cy.fixture('testData/scheduledBackgroundJobs.json').then((scheduledJobsResponse) => {
            cy.fixture('testData/historyBackgroundJobs.json').then((historyJobsResponse) => {
                cy.intercept(
                    {
                        method: 'POST',
                        url: '/modules/graphql',
                    },
                    (req) => {
                        req.continue((res) => {
                            res.body = res.body.map((originalBody: any, index) => {
                                const requestBody = req.body[index]
                                if (requestBody.operationName === 'GetBackgroundJobs') {
                                    if (requestBody.variables.includeStatuses?.includes('SCHEDULED')) {
                                        return scheduledJobsResponse
                                    } else if (requestBody.variables.excludeStatuses?.includes('SCHEDULED')) {
                                        return historyJobsResponse
                                    }
                                    return originalBody
                                }
                            })
                        })
                    },
                )
            })
        })
    })
    it('should display the history tab', () => {
        cy.login()
        const historyTab = BackgroundJobsPage.visit().goToHistoryTab()
        historyTab.should('be.visible')
        historyTab.getJobRowByLabel('HistoryJob1').should('be.visible')
        historyTab.getJobRowByLabel('HistoryJob2').should('be.visible')
        historyTab.getJobRowByLabel('HistoryJob3').should('be.visible')
        historyTab.getJobRowByLabel('HistoryJob4').should('be.visible')
    })
    it('should display the scheduled tab', () => {
        cy.login()
        const historyTab = BackgroundJobsPage.visit().goToScheduledTab()
        historyTab.should('be.visible')
        historyTab.getJobRowByLabel('ScheduledJob1').should('be.visible')
        historyTab.getJobRowByLabel('ScheduledJob2').should('be.visible')
        historyTab.getJobRowByLabel('ScheduledJob3').should('be.visible')
        historyTab.getJobRowByLabel('ScheduledJob4').should('be.visible')
    })
})
