import { LightningElement, track, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import getCaseTemporaryRecord from '@salesforce/apex/ContactSupportCaseFormController.getCaseTemporaryRecord';
import createContentDocumentLink from '@salesforce/apex/ContactSupportCaseFormController.createContentDocumentLink';
import deleteContentDocument from '@salesforce/apex/ContactSupportCaseFormController.deleteContentDocument';
import deleteFileByVersionId from '@salesforce/apex/ContactSupportCaseFormController.deleteFileByVersionId';

export default class NewCaseFormConfirm extends LightningElement {
    @track recordId;
    @track caseTemp;
    @track caseTarget;
    @track isComplete = false;

    //申込画面から渡されたレコードIDをセットする。
    //ページのURLが変わった時に呼び出される。
    @wire(CurrentPageReference)
    handlePageReference(currentPageReference) {
        this.recordId = currentPageReference.state.c__recordId;

        //コンポーネントの値を取得
        console.log('渡されたレコードID：' + this.recordId);
        if (this.recordId != undefined) {
            //Apexを呼び出す。
            getCaseTemporaryRecord({ caseTempId: this.recordId })
                .then(result => {
                    this.caseTemp = result;
                })
                .catch(error => {
                    let message = 'エラーが発生しました';
                    console.log(message);
                    if (error?.body?.message) {
                        message = error.body.message;
                    }
                    console.error(message);
                });
        }
    }

    renderedCallback() {

    }
    //取得したレコードIDから、一時保存レコードを取得する
    connectedCallback() {
        console.log('渡されたレコードID：' + this.recordId);
        // if (this.recordId != undefined) {
        //     //Apexを呼び出す。
        //     getCaseTemporaryRecord({ caseTempId: this.recordId })
        //         .then(result => {
        //             this.caseTemp = result;
        //         })
        //         .catch(error => {
        //             let message = 'エラーが発生しました';
        //             console.log(message);
        //             if (error?.body?.message) {
        //                 message = error.body.message;
        //             }
        //             console.error(message);
        //         });
        // }
    }


    //ケース登録＋ケースへファイルを紐づける。
    handleDone(event) {

        if (!this.caseTemp) {
            console.error('caseTemp が未定義です。');
            return;
        }

        //ケースのオブジェクト化
        const newCase = {
            Subject: this.caseTemp.Subject__c,
            Description: this.caseTemp.Description__c,
            Priority: this.caseTemp.Priority__c,
            Status: '新規',
            Origin: 'Web',
            ResolveLimit__c: this.caseTemp.ResolveLimit__c,
        };

        //添付ファイル
        const documents = this.caseTemp.AttachmentId__c ? this.caseTemp.AttachmentId__c.split(";") : [];
        console.log('newCase= ' + JSON.stringify(newCase));
        //Apexを呼び出す。
        createContentDocumentLink({ newCase: newCase, documents: documents })
            .then(result => {

                console.log("result=>" + result);
                this.isComplete = true;
                this.caseTarget = result;
            })
            .catch(error => {
                let message = 'エラーが発生しました';
                console.log(message);
                if (error?.body?.message) {
                    message = error.body.message;
                }
                console.error(message);
            });
    }
}