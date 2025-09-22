import { LightningElement, wire, track } from 'lwc';
import CASE_DEFLECTION_CHANNEL from '@salesforce/messageChannel/CaseDeflectionMessageChannel__c';
import { publish, subscribe, unsubscribe, MessageContext } from 'lightning/messageService';
// Apex imports removed - will be added when Apex classes are available
// import createContentDocumentLink from '@salesforce/apex/ContactSupportCaseFormController.createContentDocumentLink';
// import deleteContentDocument from '@salesforce/apex/ContactSupportCaseFormController.deleteContentDocument';
// import getContactRecords from '@salesforce/apex/ContactSupportCaseFormController.getContactRecords';
// import deleteFileByVersionId from '@salesforce/apex/ContactSupportCaseFormController.deleteFileByVersionId';
import { NavigationMixin } from 'lightning/navigation';

import { getPicklistValues, getObjectInfo } from 'lightning/uiObjectInfoApi';
import CASE_OBJECT from '@salesforce/schema/Case';
import CASE_PRIORIT_FIELD from '@salesforce/schema/Case.Priority';


export default class CaseFormTest extends NavigationMixin(LightningElement) {

    @wire(MessageContext) msgCtx;
    @track documents = [];
    @track filenames = [];
    @track fileMap = [];// { id: contentVersionId, name: ファイル名 } の配列
    @track isComplete = false;
    @track contactData = [];
    @track selectList = [];
    @track selectedValues = [];
    subject = '';
    description = '';
    selectedValue = '';
    //画面切り替え用のフラグ
    createFlag = true;
    confirmFlag = false;
    completeFlag = false;


    /**
     * 優先度選択リストの取得
    */
    @wire(getObjectInfo, { objectApiName: CASE_OBJECT })
    caseObjectInfo;
    @wire(getPicklistValues, { recordTypeId: '$caseObjectInfo.data.defaultRecordTypeId', fieldApiName: CASE_PRIORIT_FIELD })
    priorityOptions;



    /**
     * LWCライフサイクル
    */
    //要素がドキュメントに挿入されるとき
    connectedCallback() {
        if (this.createFlag) {
            console.log('getContactRecords');
            // Apex呼び出し
            getContactRecords({})
                .then(result => {
                    console.log('Apex呼び出し成功:', result);
                    this.contactData = result;
                    this.selectList = []; //初期化
                    for (let i = 0; i < this.contactData.length; i++) {
                        this.selectList.push({ label: this.contactData[i].Name + '(' + this.contactData[i].Email + ')', value: this.contactData[i].Id })
                    }
                    console.log('selectList', this.selectList);
                })
                .catch(error => {
                    console.error('Apex呼び出し失敗:', error);
                });
        }
        console.log('connectedCallback');
        if (this.documents.length > 0) {
            console.log('handleBeforeUnload');
            // Apex呼び出し
            deleteContentDocument({ documents: this.documents })
                .then(result => {
                    console.log('Apex呼び出し成功:', result);
                })
                .catch(error => {
                    console.error('Apex呼び出し失敗:', error);
                });
        }
    }

    //要素が削除されたとき
    disconnectedCallback() {
        // console.log('disconnectedCallback');
        // if (this.documents.length > 0) {
        //     console.log('handleBeforeUnload');
        //     // Apex呼び出し
        //     deleteContentDocument({ documents: this.documents })
        //         .then(result => {
        //             console.log('Apex呼び出し成功:', result);
        //         })
        //         .catch(error => {
        //             console.error('Apex呼び出し失敗:', error);
        //         });
        // }
    }

    handleChange(event) {
        console.log('handleChange', event.detail);

        this.selectedValues = event.detail.value;
    }


    get selectedValuesDisplay() {
        return this.selectedValues.join(',');
    }

    get options() {
        return this.selectList;
    }
    /*
    * ケースデフレクションへpublish
    * @param event
    */
    //件名
    handleSubjectInputChange(event) {
        this.subject = event.target.value;
        const payload = {
            modifiedField: event.target.name,
            modifiedFieldValue: event.target.value
        };
        publish(this.msgCtx, CASE_DEFLECTION_CHANNEL, payload);
    }
    //詳細項目
    handleDescriptionInputChange(event) {
        this.description = event.target.value;
        const payload = {
            modifiedField: event.target.name,
            modifiedFieldValue: event.target.value
        };
        publish(this.msgCtx, CASE_DEFLECTION_CHANNEL, payload);
    }

    /*
    * Enterキーでの誤送信防止
    * @param event
    */
    handleKeyDown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
        }
    }

    //ファイルを一時アップロードする処理
    handleUploadFinished(event) {
        const uploadedFiles = event.detail.files;
        uploadedFiles.forEach(file => {
            this.documents.push(file.contentVersionId);
            this.filenames.push('・' + file.name);
            this.fileMap.push({ id: file.contentVersionId, name: '・' + file.name });
        });
        console.log('documents= ' + this.documents);
        console.log('filenames= ' + this.filenames);
        console.log('fileMap= ' + JSON.stringify(this.fileMap));
    }


    // //確認ページへ遷移する
    // handleSubmit(event) {

    //     //お問い合わせ一時保管オブジェクトレコードの項目
    //     const newCaseTemp = {
    //         Subject__c: this.subject,
    //         Description__c: this.description,
    //         Priority__c: '中',
    //         EmailCC__c: 'xxx@xxx.xxx;aaa@bbb.ccc',
    //         ResolveLimit__c: '2025/07/15 10:00',
    //         AttachmentId__c: this.documents.join(';')
    //     };
    //     console.log(JSON.stringify(newCaseTemp));
    //     //Apexを呼び出す。
    //     insertCaseTemp({ caseTemp: newCaseTemp })
    //         .then(result => {
    //             console.log(result.message);
    //             console.log(result.id);
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
    //ケース登録＋ケースへファイルを紐づける。
    handleSubmit(event) {

        // event.preventDefault(); // ← これが重要！
        const newCase = {
            Subject: this.subject,
            Description: this.description,
            Status: 'New'
        };

        //Apexを呼び出す。
        // createContentDocumentLink({ newCase: newCase, documents: this.documents })
        //     .then(result => {
        //         this.isComplete = true;
        //         console.log(result.message);
        //         console.log(result.id);
        //         //ケースが作成されたらトーストを表示。
        //         // const evt = new ShowToastEvent({
        //         //     title: 'ケースが作成されました',
        //         //     message: 'ケース「{0}」が作成されました。',
        //         //     messageData: [
        //         //         {
        //         //             url: `/customerportal/s/case/${result.id}`,
        //         //             label: `#${result.id}`
        //         //         }
        //         //     ],
        //         //     variant: 'success',
        //         //     mode: 'dismissable'
        //         // });
        //         // this.dispatchEvent(evt);

        //         // //サンクスページへの遷移
        //         // this[NavigationMixin.Navigate]({
        //         //     type: 'comm__namedPage',
        //         //     attributes: {
        //         //         pageName: 'Home',
        //         //     },
        //         // }, false);
        //     })
        //     .catch(error => {
        //         let message = 'エラーが発生しました';
        //         console.log(message);
        //         if (error?.body?.message) {
        //             message = error.body.message;
        //         }
        //         console.error(message);
        //     });
        
        // 一時的にコンソールに出力
        console.log('Case data:', newCase);
        alert('ケースデータがコンソールに出力されました。');
    }



    //ファイルのアップロード後、保存前削除
    //削除の×ボタンを押下した
    handleRemoveFile(event) {
        const index = parseInt(event.target.dataset.index, 10);
        const removedFile = this.documents[index];
        
        // 一時的にローカルでのみ削除
        this.documents = this.documents.filter(id => id !== removedFile);
        this.filenames = this.filenames.filter((_, i) => i !== index);
        
        console.log('File removed:', removedFile);
        
        // Apex呼び出しは一時的にコメントアウト
        // deleteFileByVersionId({ contentVersionId: removedFile })
        //     .then(() => {
        //         this.documents = this.documents.filter(id => id !== removedFile);
        //         this.filenames = this.filenames.filter((_, i) => i !== index);
        //     }).catch(error => {
        //         console.error('ファイル削除エラー:', error.body.message);
        //     });
    }



    // handleBeforeUnload = (event) => {
    //     console.log('handleBeforeUnload');
    //     if (this.documents.length > 0) {
    //         // Apex呼び出し（非同期なので完了前にページが閉じる可能性あり）
    //         DeleteContentDocument({ documents: this.documents })
    //             .then(result => {
    //                 console.log('Apex呼び出し成功:', result);
    //             })
    //             .catch(error => {
    //                 console.error('Apex呼び出し失敗:', error);
    //             });
    //     }
    // };

}