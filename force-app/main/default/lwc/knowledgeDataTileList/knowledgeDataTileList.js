import { LightningElement, track, api } from 'lwc';
import getKnowledgeRecords from '@salesforce/apex/SearchKnowledgeController.getKnowledgeRecords';

export default class KnowledgeDataTileList extends LightningElement {

    @track records;
    @api topic;

    connectedCallback() {
        getKnowledgeRecords({ topicId: this.topic })
            .then(result => {
                this.records = result;
                console.log('sucsess');
            })
            .catch(error => {
                console.error('error:', error);
            });
    }


}