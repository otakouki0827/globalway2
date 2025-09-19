import { LightningElement, track, api } from 'lwc';
import getKnowledgeRecords from '@salesforce/apex/SearchKnowledgeController.getKnowledgeRecords';


export default class KnowledgeDataList extends LightningElement {


    @track records;
    @api condition;
    @api condition2;
    // @api objectName;
    // @api queryString;

    connectedCallback() {
        console.log("condition：", this.conditiont);
        getKnowledgeRecords({ condition: this.condition, condition2: this.condition2 })
            .then(result => {
                this.records = result;
                console.log('sucsess');
            })
            .catch(error => {
                console.error('error:', error);
            });
    }






}