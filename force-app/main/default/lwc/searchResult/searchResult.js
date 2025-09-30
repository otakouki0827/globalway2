// ========================================
// Lightning Web Componentのインポート文
// ========================================

// Lightning Web Componentの基本モジュールをインポート
// LightningElement: LWCの基本クラス（ReactのComponentクラスに相当）
// api: 外部からアクセス可能なプロパティを定義するデコレーター
// track: プロパティの変更を監視して画面を自動更新するデコレーター
import { LightningElement, api, track } from 'lwc';

// Apexコントローラーのメソッドをインポート
// @salesforce/apex/名前空間.クラス名.メソッド名の形式でインポート
// このメソッドは非同期で実行され、Promiseを返す
import getKnowledgeArticleSOSL from '@salesforce/apex/SearchResultController.getKnowledgeArticleSOSL';

// Salesforceのナビゲーション機能をインポート
// NavigationMixin: ページ遷移やURL生成の機能を提供するミックスイン
// 他のページやレコード詳細ページへの遷移に使用
import { NavigationMixin } from "lightning/navigation";

/**
 * 検索結果を表示するLightning Web Component
 * 
 * 【コンポーネント概要】
 * - ナレッジ記事とCaseを横断検索し、結果を一覧表示する
 * - 検索結果のクリックでナレッジ記事の詳細ページに遷移
 * - レスポンシブデザインでモバイル・デスクトップ両対応
 * 
 * 【技術仕様】
 * - フレームワーク: Lightning Web Component (LWC)
 * - 言語: JavaScript (ES6+)
 * - スタイリング: CSS3 + Salesforce Lightning Design System (SLDS)
 * - データ取得: Apexコントローラー経由でSOSL/SOQLクエリ実行
 * 
 * 【ライフサイクル】
 * 1. コンポーネント初期化
 * 2. connectedCallback()実行（検索実行）
 * 3. Apexメソッド呼び出し（非同期）
 * 4. 検索結果の表示
 * 5. ユーザーインタラクション（クリック等）
 * 6. ナビゲーション実行
 * 
 * 【親子関係】
 * - 親コンポーネントから検索キーワード（term）を受け取る
 * - 検索結果データ（data）を親に渡す（現在は未実装）
 * - 独立したコンポーネントとしても使用可能
 */
export default class SearchResult extends NavigationMixin(LightningElement) {
    /**
     * Lightning Web Componentのプロパティデコレーター説明
     * 
     * 【@api デコレーター】
     * - 外部（親コンポーネント）からアクセス可能なプロパティ
     * - プロパティの変更時に自動的に画面が更新される（リアクティブ）
     * - 親コンポーネントから値を設定・取得可能
     * - 使用例: <c-search-result term="検索キーワード"></c-search-result>
     * 
     * 【@track デコレーター】
     * - コンポーネント内部の私有変数
     * - プロパティの変更時に自動的に画面が更新される（リアクティブ）
     * - 外部からは直接アクセス不可
     * - オブジェクトや配列の内部プロパティ変更も監視
     * 
     * 【通常の変数】
     * - コンポーネント内部の私有変数
     * - 画面初期化時に一度のみ取得
     * - 変更しても画面は更新されない（非リアクティブ）
     * - 計算用の一時変数や定数に使用
     */
    
    /**
     * 検索結果データ
     * 
     * 【データ形式】
     * - Apexから取得したSearchResultオブジェクトの配列
     * - 初期値: 空の配列（[]）
     * - 検索実行後: SearchResultオブジェクトが格納された配列
     * 
     * 【使用場面】
     * - HTMLテンプレートでの検索結果一覧表示
     * - 検索結果の件数表示
     * - 検索結果のフィルタリングやソート
     * 
     * 【データフロー】
     * 1. 親コンポーネントから初期値として空配列を受け取る
     * 2. connectedCallback()でApexメソッドを呼び出し
     * 3. Apexから検索結果を取得してdataプロパティに格納
     * 4. HTMLテンプレートで検索結果を表示
     */
    @api data = [];
    
    /**
     * 検索キーワード
     * 
     * 【データ形式】
     * - 文字列（String）
     * - 初期値: undefined（親から値が渡されない場合）
     * - 親コンポーネントから受け取る検索語
     * 
     * 【使用場面】
     * - Apexメソッドの呼び出し時のパラメータ
     * - 検索結果の表示タイトル
     * - デバッグログでの検索語確認
     * 
     * 【データフロー】
     * 1. 親コンポーネントから検索キーワードを受け取る
     * 2. connectedCallback()で値の有無をチェック
     * 3. 値がある場合のみApexメソッドを呼び出し
     * 4. Apexメソッドに検索キーワードを渡す
     */
    @api term;

    /**
     * 検索結果の総件数
     * 
     * 【データ形式】
     * - 数値（Number）
     * - 初期値: 0
     * - 検索結果の総件数を格納
     * 
     * 【使用場面】
     * - HTMLテンプレートでの件数表示
     * - ページネーション機能（将来実装時）
     * - 検索結果の統計情報表示
     */
    @track totalCount = 0;

    /**
     * 表示中の検索結果件数
     * 
     * 【データ形式】
     * - 数値（Number）
     * - 初期値: 0
     * - 現在表示されている検索結果の件数
     * 
     * 【使用場面】
     * - HTMLテンプレートでの表示件数表示
     * - ページネーション機能（将来実装時）
     * - 検索結果の表示範囲管理
     */
    @track displayCount = 0;

    /**
     * コンポーネントがDOMに接続された時に実行されるライフサイクルフック
     * 検索キーワードが指定されている場合、Apexメソッドを呼び出して検索を実行
     */
    connectedCallback() {
        console.log('検索キーワード:', this.term);
        
        // 検索キーワードが指定されている場合のみ検索を実行
        if (this.term != undefined) {
            // ApexコントローラーのgetKnowledgeArticleSOSLメソッドを呼び出し
            // パラメータ：検索キーワードと最大取得件数（2000件）
            getKnowledgeArticleSOSL({ searchKeyword: this.term, limitNum: 2000 })
                .then(result => {
                    // 検索成功時の処理
                    // 検索結果にタグ情報を追加
                    this.data = result.map(item => {
                        return {
                            ...item,
                            Tags: this.generateTags(item.Type, item.SubType)
                        };
                    });
                    
                    // 検索結果の件数を更新
                    this.totalCount = result.length;
                    this.displayCount = result.length;
                    
                    console.log("Apexから検索結果を取得しました");
                    console.log("検索結果件数:", this.totalCount);
                    console.log(this.data);
                    
                    // TODO: 将来的な改善案
                    // Apexの中でMap形式にする。{objName:List}の形式でデータを整理
                    // LWCでより効率的にデータを取り扱う
                }).catch(error => {
                    // エラー発生時の処理
                    let message = '検索中にエラーが発生しました';
                    console.log(message);
                    
                    // Apexから返されたエラーメッセージがある場合はそれを使用
                    if (error?.body?.message) {
                        message = error.body.message;
                    }
                    console.error('エラー詳細:', message);
                });
        } else {
            // 検索キーワードが指定されていない場合は空の配列を表示
            this.data = [];
            this.totalCount = 0;
            this.displayCount = 0;
        }
    }
    
    /**
     * デモデータを生成するメソッド
     * 検索キーワードが指定されていない場合に表示するサンプルデータ
     */
    generateDemoData() {
        return [
            {
                Id: 'demo1',
                Title: 'マスタの終了日登録と削除の違い',
                Summary: 'マスタの終了日登録と削除の違いについて説明します。',
                Type: 'Knowledge',
                SubType: 'マニュアル',
                UrlName: 'master-end-date-difference',
                Tags: ['Combosite人事', 'Combosite給与', 'Combosite共通', '人事設定', '給与設定']
            },
            {
                Id: 'demo2',
                Title: '発令区分とは',
                Summary: '発令区分の定義と使用方法について説明します。',
                Type: 'Knowledge',
                SubType: 'マニュアル',
                UrlName: 'issuance-category',
                Tags: ['Combosite人事', '発令管理', '発令登録']
            },
            {
                Id: 'demo3',
                Title: '縦持ちフォーマット・横持ちフォーマットとは',
                Summary: 'データフォーマットの種類と使い分けについて説明します。',
                Type: 'Knowledge',
                SubType: 'マニュアル',
                UrlName: 'format-types',
                Tags: ['Combosite人事', 'Combosite給与']
            },
            {
                Id: 'demo4',
                Title: '個人情報変更の確認',
                Summary: '個人情報変更時の確認手順について説明します。',
                Type: 'Knowledge',
                SubType: 'マニュアル',
                UrlName: 'personal-info-change',
                Tags: ['Combosite人事', 'Combosite共通', '個人情報管理']
            },
            {
                Id: 'demo5',
                Title: '人事台帳とは (個人情報・異動履歴)',
                Summary: '人事台帳の機能と使用方法について説明します。',
                Type: 'Knowledge',
                SubType: 'マニュアル',
                UrlName: 'hr-ledger',
                Tags: ['Combosite人事', '従業員管理']
            },
            {
                Id: 'demo6',
                Title: '発令一覧画面からの確認・編集・削除方法',
                Summary: '発令一覧画面での操作方法について説明します。',
                Type: 'Knowledge',
                SubType: 'マニュアル',
                UrlName: 'issuance-list-operations',
                Tags: ['Combosite人事', '発令管理', '発令一覧(一時保存)', '発令一覧']
            },
            {
                Id: 'demo7',
                Title: '発令の新規登録方法 (個別登録)',
                Summary: '個別登録での発令登録手順について説明します。',
                Type: 'Knowledge',
                SubType: 'マニュアル',
                UrlName: 'issuance-individual-registration',
                Tags: ['Combosite人事', '発令管理', '発令登録']
            },
            {
                Id: 'demo8',
                Title: '発令登録における「一時保存」と「確定」の違いについて',
                Summary: '一時保存と確定の違いと使い分けについて説明します。',
                Type: 'Knowledge',
                SubType: 'マニュアル',
                UrlName: 'temporary-save-vs-confirm',
                Tags: ['Combosite人事', '発令登録']
            }
        ];
    }
    
    /**
     * タグを生成するメソッド
     * オブジェクトタイプとサブタイプに基づいてタグを生成
     */
    generateTags(type, subType) {
        const tagMap = {
            'Knowledge': {
                'マニュアル': ['Combosite人事', 'マニュアル', '操作手順'],
                'リリースノート': ['Combosite人事', 'リリースノート', '更新情報'],
                'FAQ': ['Combosite人事', 'FAQ', 'よくある質問']
            },
            'Case': {
                '技術サポート': ['お問い合わせ', '技術サポート', 'システム'],
                'バグ報告': ['お問い合わせ', 'バグ報告', '不具合'],
                '機能要求': ['お問い合わせ', '機能要求', '改善要望']
            },
            'Announcement': {
                'お知らせ': ['お知らせ', '重要', 'システム'],
                'メンテナンス': ['お知らせ', 'メンテナンス', 'システム停止'],
                '緊急連絡': ['お知らせ', '緊急', '重要']
            }
        };
        
        return tagMap[type]?.[subType] || ['その他'];
    }
    
    /**
     * 検索結果のアイテムがクリックされた時のイベントハンドラー
     * クリックされたアイテムの詳細ページに遷移する
     * 
     * @param {Event} event クリックイベント
     */
    tileClick(event) {
        console.log('tileClickメソッドが呼び出されました');
        
        // クリックされたアイテムのIDを取得
        const itemId = event.currentTarget.dataset.itemId;
        console.log('クリックされたアイテムID:', itemId);
        
        // クリックされたアイテムのデータを検索
        const clickedItem = this.data.find(item => item.Id === itemId);
        
        if (!clickedItem) {
            console.error('クリックされたアイテムが見つかりません');
            console.log('this.data:', this.data);
            return;
        }
        
        console.log('クリックされたアイテム:', clickedItem);
        
        // アイテムのタイプに応じて遷移先を決定
        try {
            if (clickedItem.Type === 'Knowledge') {
                // ナレッジ記事の場合
                const dynamicUrlName = clickedItem.UrlName || 'リリースノート-テスト';
                console.log('ナレッジ記事の遷移先URL名:', dynamicUrlName);
                console.log('ナレッジ記事の遷移を実行します');
                
                this[NavigationMixin.Navigate]({
                    type: 'standard__knowledgeArticlePage',
                    attributes: {
                        pageName: 'Article_Detail_Mock2',
                        urlName: dynamicUrlName
                    },
                });
                console.log('ナレッジ記事の遷移が完了しました');
            } else if (clickedItem.Type === 'Case') {
                // Caseの場合
                const caseUrl = '/case/' + clickedItem.Id;
                console.log('Caseの遷移先URL:', caseUrl);
                console.log('Caseの遷移先ID:', clickedItem.Id);
                console.log('Caseの遷移を実行します');
                
                this[NavigationMixin.Navigate]({
                    type: 'standard__webPage',
                    attributes: {
                        url: caseUrl
                    },
                });
                console.log('Caseの遷移が完了しました');
            } else {
                // その他の場合
                console.log('このタイプの遷移は未実装です:', clickedItem.Type);
            }
        } catch (error) {
            console.error('ナビゲーション中にエラーが発生しました:', error);
        }
    }
}