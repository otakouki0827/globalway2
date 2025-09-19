import { LightningElement, api, wire } from 'lwc';
import getTopicHierarchy from '@salesforce/apex/TopicBreadcrumbController.getTopicHierarchy';

export default class BreadCrumbComp extends LightningElement {
    @api recordId;
    breadcrumbs = [];

    @wire(getTopicHierarchy, { recordId: '$recordId' })
    wiredTopics({ error, data }) {
        if (data) {
            this.breadcrumbs = data;
        } else if (error) {
            console.error(error);
        }
    }
}