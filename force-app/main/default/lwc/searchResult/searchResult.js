import { LightningElement, api, track } from 'lwc';
import getKnowledgeArticleSOSL from '@salesforce/apex/SearchResultController.getKnowledgeArticleSOSL';
import { NavigationMixin } from "lightning/navigation";

export default class SearchResult extends NavigationMixin(LightningElement) {
    /**
     * @track XXX　コンポーネント内部私有変数、動的、変更すると画面連動
     * @api XXX　　外部から取得可能、動的、変更すると画面連動
     * XXX　　　　　コンポーネント内部私有変数、画面初期化する時一回のみ取得、変更しても、画面変わらない
     */
    @api data = [];//SOSL取得データ。
    @api term;//画面初期化時取得の検索ワード。

    connectedCallback() {
        console.log('キーワード:', this.term);
        if (this.term != undefined) {
            //Apexを呼び出す。
            getKnowledgeArticleSOSL({ searchKeyword: this.term, limitNum: 2000 })
                .then(result => {
                    this.data = result;
                    console.log("Apexから取得");
                    console.log(this.data);
                    // TODO:
                    // Apexの中でMapにする。{objName:List}
                    // LWCでデータを取り扱う。
                }).catch(error => {
                    let message = 'エラーが発生しました';
                    console.log(message);
                    if (error?.body?.message) {
                        message = error.body.message;
                    }
                    console.error(message);
                });
        }
    }
    tileClick(event) {
        //　確認画面へ遷移。
        this[NavigationMixin.Navigate]({
            type: 'standard__knowledgeArticlePage',
            attributes: {
                pageName: 'Article_Detail',
                urlName: 'リリースノート-テスト'//TODO:URLNAMEを動的に付与するようにする。
            },
        });
    }
}