import { BaseComponent, BasePage, getComponent } from '@jahia/cypress'

export class BackgroundJobsPage extends BasePage {
    static visit() {
        cy.visit('/jahia/administration/backgroundJobs')
        return new BackgroundJobsPage()
    }

    goToHistoryTab() {
        cy.get('[data-testid="background-jobs-history-tab"]').click({force:true})
        cy.waitUntil(() => cy.get('[data-testid="history-background-jobs-table"]').should('be.visible'))
        return getComponent(HistoryBackgroundJobsTab)
    }

    goToScheduledTab() {
        cy.get('[data-testid="background-jobs-scheduled-tab"]').click({force:true})
        cy.waitUntil(() => cy.get('[data-testid="scheduled-background-jobs-table"]').should('be.visible'))
        return getComponent(ScheduledBackgroundJobsTab)
    }
}

export class HistoryBackgroundJobsTab extends BaseComponent {
    static readonly defaultSelector = '[data-testid="history-background-jobs-table"]'

    getJobRowByLabel(label: string) {
        this.get().find('tr').contains(label).first().as('jobRowByLabel')
        cy.get('@jobRowByLabel').scrollIntoView()
        cy.get('@jobRowByLabel').should('be.visible')
        return cy.get('@jobRowByLabel')
    }
}

export class ScheduledBackgroundJobsTab extends BaseComponent {
    static readonly defaultSelector = '[data-testid="scheduled-background-jobs-table"]'

    getJobRowByLabel(label: string) {
        this.get().find('tr').contains(label).first().as('jobRowByLabel')
        cy.get('@jobRowByLabel').scrollIntoView()
        cy.get('@jobRowByLabel').should('be.visible')
        return cy.get('@jobRowByLabel')
    }
}
