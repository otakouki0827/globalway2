import { LightningElement, wire, track } from 'lwc';
import CASE_DEFLECTION_CHANNEL from '@salesforce/messageChannel/CaseDeflectionMessageChannel__c';
import { publish, subscribe, unsubscribe, MessageContext } from 'lightning/messageService';
import createContentDocumentLink from '@salesforce/apex/ContactSupportCaseFormController.createContentDocumentLink';
import deleteFileByVersionId from '@salesforce/apex/ContactSupportCaseFormController.deleteFileByVersionId';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getPicklistValues, getObjectInfo } from 'lightning/uiObjectInfoApi';
import CASE_OBJECT from '@salesforce/schema/Case';
import CASE_PRIORIT_FIELD from '@salesforce/schema/Case.Priority';
import CASE_SUBJECT_FIELD from '@salesforce/schema/Case.Subject';
import CASE_DESCRIPTION_FIELD from '@salesforce/schema/Case.Description';


export default class ContactSupportCaseForm extends NavigationMixin(LightningElement) {

    @wire(MessageContext) msgCtx;
    @track documents = [];//contentVersionId
    @track filenames = [];//ファイル名
    @track fileMap = [];// { id: contentVersionId, name: ファイル名 } の配列
    @track isLoading = false;//ローディングアニメのフラグ
    //画面切り替え用のフラグ
    step = '1';//初期値は1
    //各項目の値
    subject = '';//件名の値
    description = '';//詳細の値
    priorityValue = '低';//優先度の値
    resolutionDate = '';//解決期限（日付）の値
    resolutionTime = '';//解決期限（時間）の値
    resolutionFormattedDate = '';//解決期限表示用の値
    hhmmList = [];

    //オブジェクト情報
    recordTypeId = null;//レコードタイプID
    subjectMaxLen = 255;//件名の最大文字数（初期値）
    descriptionMaxLen = 32000;//詳細の最大文字数（初期値）
    deleteNgFlag = true;//画面遷移
    caseNumber = '';//ケース番号


    /**
     * 項目最大文字数、デフォルトレコードタイプの取得
     */
    @wire(getObjectInfo, { objectApiName: CASE_OBJECT })
    caseObjectInfo({ data, error }) {
        if (data) {
            this.recordTypeId = data.defaultRecordTypeId;
            const fSubject = data.fields[CASE_SUBJECT_FIELD.fieldApiName];
            const fDescription = data.fields[CASE_DESCRIPTION_FIELD.fieldApiName];
            if (fSubject?.length) this.subjectMaxLen = fSubject.length;
            if (fDescription?.length) this.descriptionMaxLen = fDescription.length;

        }
    }
    /**
     * 優先度選択リストの取得
    */
    @wire(getPicklistValues, { recordTypeId: '$recordTypeId', fieldApiName: CASE_PRIORIT_FIELD })
    priorityOptions;

    /*
     * ページの切り替え
    */
    //申込のステップ
    get isApplicationStep() {
        return this.step === '1';
    }
    //確認のステップ
    get isConfirmationStep() {
        return this.step === '2';
    }
    //完了のステップ
    get isCompletedStep() {
        return this.step === '3';
    }
    /**
     * ページ切り替えボタン押下
    */
    //戻るボタンを押下
    goBack() {
        this.step = '1';
        this.scrollToTop();
    }
    //登録するボタンを押下
    goConfirmation() {
        //バリデーションチェック
        if (this.isInputValid()) {

            //添付ファイル上限制限
            if (this.documents.length > 10) {
                this.showErrorToast('添付ファイルが制限に達しました', 'お問い合わせ登録の添付ファイルは最大10件までとなります。', 'dismissible');
                return;
            }
            this.step = '2';
            this.scrollToTop();

        } else {
            this.showErrorToast('必須項目が未入力です。', '※が付いている項目は入力必須項目です。', 'dismissible');
        }
    }
    //確定ボタンを押下
    goCompleted() {
        this.step = '3';
        this.isLoading = true;
        const newCase = {
            Subject: this.subject,
            Description: this.description,
            Status: '新規',
            Priority: this.priorityValue,
            Origin: 'Web',
        };

        //Apexを呼び出す。
        createContentDocumentLink({
            newCase: newCase, documents: this.documents,
            resolutionDate: this.resolutionDate, resolutionTime: this.resolutionTime
        })
            .then(result => {
                // console.log(result);
                this.caseNumber = result;
                this.scrollToTop();
                this.isLoading = false;
            })
            .catch(error => {
                this.isLoading = false;
                this.showErrorToast('エラーが発生しました', '登録に失敗しました。サポートへメールでご連絡ください。\nsupport@pathoslogos.co.jp', 'sticky');
                let message = 'エラーが発生しました';
                console.log(message);
            });
    }
    //一覧へ戻るボタンを押下
    goContactListPage() {
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: {
                recordId: '',
                objectApiName: 'Case',
                actionName: 'list'
            }
        });
    }
    //エラートースト
    showErrorToast(title, message, mode) {
        const evt = new ShowToastEvent({
            title: title,
            message: message,
            variant: 'error',
            mode: mode
        });
        this.dispatchEvent(evt);
    }
    /**
     * validationチェック
    */
    isInputValid() {
        //validationチェックするタグを取得。required以外は除外する。 
        const fields = Array.from(
            this.template.querySelectorAll('lightning-input, lightning-textarea, lightning-combobox')
        ).filter(inputField => inputField.required);

        let isValid = true;
        fields.forEach(inputField => {
            if (!inputField.checkValidity()) {
                inputField.reportValidity();
                isValid = false;
            }
        });
        return isValid;
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
    /**
     * 画面上部へスクロールする。
     * 
    */
    scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
    //優先度
    handlePriorityChange(event) {
        this.priorityValue = event.target.value;
    }
    //解決期限
    //日付
    handleResolutionDateChange(event) {
        //マウス操作で消した時は、スキップ
        if (event.target.value == undefined) {
            this.resolutionDate = '';
            this.resolutionTime = '';
        } else {
            this.resolutionDate = event.target.value;
            if (this.resolutionTime == '') {
                this.resolutionTime = '18:00';
            }
        }
        this.formattedResolutionDate();
    }
    //時間
    handleResolutionTimeChange(event) {
        if (event.target.value == undefined) {
            this.resolutionTime = '';
        } else {
            this.resolutionTime = event.target.value;
        }
        this.formattedResolutionDate();
    }
    //日付＋時間の形式に整形する
    formattedResolutionDate() {
        if (this.resolutionDate != '') {
            if (this.resolutionTime == '') {
                this.resolutionFormattedDate = this.resolutionDate + ' 18:00';
            } else {
                this.hhmmList = [];
                this.hhmmList = this.resolutionTime.split(':');
                if (this.hhmmList.length > 1) {
                    const hh = this.hhmmList[0];
                    const mm = this.hhmmList[1];
                    this.resolutionFormattedDate = this.resolutionDate + ' ' + hh + ":" + mm;
                } else {
                    this.resolutionFormattedDate = this.resolutionDate + ' 18:00';
                }
            }
        } else {
            this.resolutionFormattedDate = '';
        }
    }

    //ファイルをアップロードする処理
    handleUploadFinished(event) {
        const uploadedFiles = event.detail.files;
        uploadedFiles.forEach(file => {
            this.documents.push(file.contentVersionId);
            this.filenames.push(file.name);
            this.fileMap.push({ id: file.contentVersionId, name: file.name });
        });
    }

    /**
     * 
     * 添付ファイル削除機能
     * 
    */
    //削除の×ボタンを押下した
    handleRemoveFile(event) {
        const index = parseInt(event.target.dataset.index, 10);
        const removedFile = this.documents[index];
        deleteFileByVersionId({ contentVersionId: removedFile })
            .then(() => {
                this.documents = this.documents.filter(id => id !== removedFile);
                this.filenames = this.filenames.filter((_, i) => i !== index);
            }).catch(error => {
                let message = 'エラーが発生しました';
                console.log(message);
            });
    }
}