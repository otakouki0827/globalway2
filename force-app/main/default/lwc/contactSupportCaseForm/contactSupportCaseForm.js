import { LightningElement, wire, track } from 'lwc';
import CASE_DEFLECTION_CHANNEL from '@salesforce/messageChannel/CaseDeflectionMessageChannel__c';
import { publish, subscribe, unsubscribe, MessageContext } from 'lightning/messageService';
import createContentDocumentLinkWithCustomFields from '@salesforce/apex/ContactSupportCaseFormController.createContentDocumentLinkWithCustomFields';
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
    category = '';//種別の値
    subject = '';//件名の値
    description = '';//詳細の値
    priorityValue = '低';//優先度の値
    resolutionDate = '';//解決期限（日付）の値
    resolutionTime = '';//解決期限（時間）の値
    resolutionFormattedDate = '';//解決期限表示用の値
    hhmmList = [];

    // 動的項目の値
    // 不具合起票の新しい項目
    reporterName = '';//起票者（氏名・部署）
    productErrorLocation = '';//製品/エラー発生箇所
    bugOverview = '';//不具合概要
    detailedContent = '';//詳細内容
    environment = '';//発生環境
    occurrenceFrequency = '';//発生頻度
    reproductionSteps = '';//再現手順
    expectedAction = '';//期待される動作
    currentSituation = '';//現在の状況
    
    // 要望の項目
    expectedEffect = '';//改善度のイメージ/期待効果
    implementationPeriod = '';//導入希望時期

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

    // 種別選択オプション
    get categoryOptions() {
        return [
            { label: '不具合起票', value: 'bug' },
            { label: '要望', value: 'request' },
            { label: '質問', value: 'question' }
        ];
    }

    // 導入希望時期オプション
    get implementationPeriodOptions() {
        return [
            { label: '-なし-', value: '' },
            { label: '1ヶ月以内', value: '1month' },
            { label: '3ヶ月以内', value: '3months' },
            { label: '6ヶ月以内', value: '6months' },
            { label: '1年以内', value: '1year' }
        ];
    }

    // 発生頻度オプション
    get occurrenceFrequencyOptions() {
        return [
            { label: '毎回発生', value: 'always' },
            { label: '時々発生', value: 'sometimes' },
            { label: '1回のみ', value: 'once' }
        ];
    }

    // 種別に応じた動的表示制御
    get isBugCategory() {
        return this.category === 'bug';
    }

    get isRequestCategory() {
        return this.category === 'request';
    }

    get isQuestionCategory() {
        return this.category === 'question';
    }



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
                
                // 種別に応じて件名と詳細を設定
                let subject = this.subject;
                let description = this.description;
                
                if (this.category === 'bug') {
                    // 不具合起票の場合
                    subject = this.bugOverview || '不具合起票';
                    description = '不具合の詳細報告';
                } else if (this.category === 'request') {
                    // 要望の場合
                    subject = this.subject || '要望';
                    description = this.description || '機能要望';
                } else if (this.category === 'question') {
                    // 質問の場合
                    subject = this.subject || '質問';
                    description = this.description || 'お問い合わせ';
                }
                
                const newCase = {
                    Subject: subject,
                    Description: description,
                    Status: '新規',
                    Priority: this.priorityValue,
                    Origin: 'Web',
                };

                //Apexを呼び出す。
                createContentDocumentLinkWithCustomFields({
                    newCase: newCase, 
                    documents: this.documents,
                    resolutionDate: this.resolutionDate, 
                    resolutionTime: this.resolutionTime,
                    category: this.category,
                    expectedEffect: this.expectedEffect,
                    implementationPeriod: this.implementationPeriod,
                    reporterName: this.reporterName,
                    productErrorLocation: this.productErrorLocation,
                    bugOverview: this.bugOverview,
                    detailedContent: this.detailedContent,
                    environment: this.environment,
                    occurrenceFrequency: this.occurrenceFrequency,
                    reproductionSteps: this.reproductionSteps,
                    expectedAction: this.expectedAction,
                    currentSituation: this.currentSituation
                })
                    .then(result => {
                        console.log('Apex result:', result);
                        console.log('Result type:', typeof result);
                        console.log('Result length:', result ? result.length : 'null/undefined');
                        
                        if (result && result !== '') {
                            this.caseNumber = result;
                            console.log('Case number set to:', this.caseNumber);
                        } else {
                            this.caseNumber = '取得中...';
                            console.log('Case number is empty, showing "取得中..."');
                        }
                        
                        this.scrollToTop();
                        this.isLoading = false;
                    })
                    .catch(error => {
                        console.error('Apex error:', error);
                        console.error('Error message:', error.message);
                        console.error('Error body:', error.body);
                        this.isLoading = false;
                        this.caseNumber = 'エラー';
                        this.showErrorToast('エラーが発生しました', '登録に失敗しました。サポートへメールでご連絡ください。\nsupport@pathoslogos.co.jp', 'sticky');
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
        // 種別が選択されていない場合はエラー
        if (!this.category) {
            this.showErrorToast('必須項目が未入力です。', '種別を選択してください。', 'dismissible');
            return false;
        }

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

        // 種別に応じた追加バリデーション
        if (this.category === 'bug') {
            if (!this.reporterName || !this.productErrorLocation || !this.bugOverview || !this.detailedContent || !this.environment || !this.occurrenceFrequency || !this.reproductionSteps || !this.expectedAction || !this.currentSituation) {
                this.showErrorToast('必須項目が未入力です。', '不具合起票の必須項目をすべて入力してください。', 'dismissible');
                isValid = false;
            }
        } else if (this.category === 'request') {
            if (!this.subject || !this.description || !this.expectedEffect) {
                this.showErrorToast('必須項目が未入力です。', '要望の必須項目をすべて入力してください。', 'dismissible');
                isValid = false;
            }
        } else if (this.category === 'question') {
            if (!this.subject || !this.description) {
                this.showErrorToast('必須項目が未入力です。', '質問の必須項目をすべて入力してください。', 'dismissible');
                isValid = false;
            }
        }

        return isValid;
    }
    /*
    * Enterキーでの誤送信防止
    * @param event
    */
    handleKeyDown(event) {
        // lightning-textareaでは改行を許可し、lightning-inputでのみEnterキーを無効化
        if (event.key === 'Enter') {
            const target = event.target;
            // lightning-textareaの場合は改行を許可
            if (target.tagName === 'TEXTAREA' || 
                target.classList.contains('slds-textarea') ||
                target.getAttribute('data-element-type') === 'textarea') {
                // テキストエリアの場合は何もしない（改行を許可）
                return;
            }
            // その他の入力フィールドではEnterキーを無効化
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

    //種別変更
    handleCategoryChange(event) {
        this.category = event.target.value;
        // 種別変更時に他の項目をリセット
        this.resetDynamicFields();
    }

    // 動的項目のリセット
    resetDynamicFields() {
        this.subject = '';
        this.description = '';
        // 不具合起票の項目
        this.reporterName = '';
        this.productErrorLocation = '';
        this.bugOverview = '';
        this.detailedContent = '';
        this.environment = '';
        this.occurrenceFrequency = '';
        this.reproductionSteps = '';
        this.expectedAction = '';
        this.currentSituation = '';
        // 要望の項目
        this.expectedEffect = '';
        this.implementationPeriod = '';
    }

    // 動的項目のハンドラー
    // 不具合起票の項目
    handleReporterNameChange(event) {
        this.reporterName = event.target.value;
    }

    handleProductErrorLocationChange(event) {
        this.productErrorLocation = event.target.value;
    }

    handleBugOverviewChange(event) {
        this.bugOverview = event.target.value;
    }

    handleDetailedContentChange(event) {
        this.detailedContent = event.target.value;
    }

    handleEnvironmentChange(event) {
        this.environment = event.target.value;
    }

    handleOccurrenceFrequencyChange(event) {
        this.occurrenceFrequency = event.target.value;
    }

    handleReproductionStepsChange(event) {
        this.reproductionSteps = event.target.value;
    }

    handleExpectedActionChange(event) {
        this.expectedAction = event.target.value;
    }

    handleCurrentSituationChange(event) {
        this.currentSituation = event.target.value;
    }

    // 要望の項目
    handleExpectedEffectChange(event) {
        this.expectedEffect = event.target.value;
    }

    handleImplementationPeriodChange(event) {
        this.implementationPeriod = event.target.value;
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