import { LightningElement, track, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getKnowledgeRecords from '@salesforce/apex/SearchNoticeController.getKnowledgeRecords';


export default class noticeSelectDataList extends NavigationMixin(LightningElement) {
    @track notice = [];
    @track contactData = [];
    @track selectList = [];
    @api limit;

    connectedCallback() {
        // console.log("limitNum：", this.limit);
        getKnowledgeRecords({ limitNum: this.limit })
            .then(result => {
                this.notice = result;
                // console.log('sucsess');
                // console.log(result);
                this.contactData = result;
                this.selectList = []; //初期化
                for (let i = 0; i < this.contactData.length; i++) {
                    this.selectList.push({ label: this.contactData[i].Name + '(' + this.contactData[i].Email + ')', value: this.contactData[i].Id })
                }
            })
            .catch(error => {
                console.log('error');
            });
    }

    // 検索結果の遷移
    handleRowAction(event) {
        const urlName = event.currentTarget.dataset.urlname;
        this[NavigationMixin.Navigate]({
            type: 'standard__knowledgeArticlePage',
            attributes: {
                pageName: 'Article_Detail',
                urlName: urlName
            },
        });
    }
    //topicタグをクリック遷移
    handleRowTagAction(event) {
        const topic = event.currentTarget.dataset.topic;
        const url = `/topic/${topic}`
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: url
            },
        });
    }
}