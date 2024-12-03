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
                        const indexOfBackgroundJobsRequest = req.body.findIndex(
                            (body: any) => body.operationName === 'GetBackgroundJobs',
                        )

                        if (indexOfBackgroundJobsRequest === -1) {
                            req.continue()
                            return
                        }

                        const gqlRequest = req.body[indexOfBackgroundJobsRequest]
                        let stubbedResponse = null
                        if (gqlRequest.variables.includeStatuses?.includes('SCHEDULED')) {
                            stubbedResponse = scheduledJobsResponse
                        } else if (gqlRequest.variables.excludeStatuses?.includes('SCHEDULED')) {
                            stubbedResponse = historyJobsResponse
                        }
                        req.continue((res) => {
                            res.body[indexOfBackgroundJobsRequest] = stubbedResponse
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
