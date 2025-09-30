/**
 * 検索結果を管理するコントローラークラス
 * Lightning Web Componentから呼び出されるApexメソッドを提供
 */
public with sharing class SearchResultController {
    
    /**
     * ナレッジ記事とCaseを横断検索するメソッド
     * 
     * 【機能概要】
     * - SOSL（Salesforce Object Search Language）を使用して全文検索を実行
     * - Caseオブジェクトから未完了のお問い合わせを検索
     * - デモ用のサンプルデータ（マニュアル、リリースノート、お知らせ）を追加
     * - 検索結果をSearchResultオブジェクトのリスト形式で返却
     * 
     * 【技術詳細】
     * - @AuraEnabled: Lightning Web Componentから呼び出し可能
     * - cacheable=true: 同じパラメータでの再呼び出し時にキャッシュを使用してパフォーマンス向上
     * - with sharing: ユーザーのデータアクセス権限に基づいて実行
     * 
     * 【処理フロー】
     * 1. SOSLクエリを構築（キーワードエスケープ処理付き）
     * 2. Search.query()でSOSLクエリを実行
     * 3. 検索結果をSearchResultオブジェクトに変換
     * 4. サンプルデータを追加（デモ用）
     * 5. エラーハンドリング（AuraHandledExceptionでLWCにエラー伝達）
     * 
     * @param searchKeyword 検索キーワード（ユーザーが入力した検索語）
     *                      - nullや空文字の場合は全件検索
     *                      - String.escapeSingleQuotes()でSQLインジェクション対策
     * @param limitNum 検索結果の最大件数
     *                 - パフォーマンス向上のため適切な値を設定推奨
     *                 - 現在の実装では2000件まで対応
     * @return List<SearchResult> 検索結果を格納したSearchResultオブジェクトの配列
     *         - 空の場合は空のリストを返却
     *         - エラー時はAuraHandledExceptionをスロー
     * 
     * @throws AuraHandledException 検索処理中にエラーが発生した場合
     *         - エラーメッセージはLWCで表示可能
     *         - System.debug()でデバッグログにも出力
     */
    @AuraEnabled(cacheable=true) // キャッシュを有効にしてパフォーマンスを向上
    public static List<SearchResult> getKnowledgeArticleSOSL(String searchKeyword, Integer limitNum) {
        // 検索結果を格納するリストを初期化
        // List<SearchResult>: SearchResultオブジェクトの動的配列
        // 検索結果が0件の場合でも空のリストを返却するため、必ず初期化が必要
        List<SearchResult> results = new List<SearchResult>();
        
        try {
            // ========================================
            // SOSL検索クエリの構築処理
            // ========================================
            
            // SOSLクエリの基本構造を構築
            // FIND句: 検索キーワードを指定（シングルクォートで囲む）
            // IN ALL FIELDS: オブジェクトの全フィールドを検索対象とする
            // RETURNING: 検索対象のオブジェクトと取得フィールドを指定
            String searchQuery = 'FIND \'' + String.escapeSingleQuotes(searchKeyword) + '\' IN ALL FIELDS RETURNING ';
            
            // Caseオブジェクトの検索条件を追加
            // Id, Subject, Description, Type, Status: 取得するフィールド
            // WHERE IsClosed = false: 未完了のお問い合わせのみを対象とする
            // これにより、解決済みのお問い合わせは検索結果から除外される
            searchQuery += 'Case(Id, Subject, Description, Type, Status WHERE IsClosed = false), ';
            
            // ナレッジオブジェクト（Knowledge__kav）の検索条件を追加
            // Id, Title, UrlName: 取得するフィールド
            // WHERE PublishStatus = 'Online': 公開済みのナレッジ記事のみを対象とする
            // UrlName: ナビゲーション用のURL名
            searchQuery += 'Knowledge__kav(Id, Title, UrlName WHERE PublishStatus = \'Online\') ';
            
            // 取得件数の制限を追加
            // LIMIT句: パフォーマンス向上のため検索結果の最大件数を制限
            // limitNumパラメータで動的に設定可能
            searchQuery += 'LIMIT ' + limitNum;
            
            // ========================================
            // SOSLクエリの実行と結果取得
            // ========================================
            
            // Search.query()メソッドでSOSLクエリを実行
            // 戻り値: List<List<SObject>>の形式
            // - 外側のList: オブジェクトタイプごとの配列
            // - 内側のList: 各オブジェクトタイプの検索結果レコード
            // 例: searchResults[0] = Caseオブジェクトの配列, searchResults[1] = 他のオブジェクトの配列
            List<List<SObject>> searchResults = Search.query(searchQuery);
            
            // 検索結果からCaseオブジェクトの配列を取得
            // searchResults[0]: 最初のオブジェクトタイプ（Case）の検索結果
            // (List<Case>): 型キャストでCaseオブジェクトのリストとして扱う
            List<Case> cases = (List<Case>) searchResults[0];
            
            // 検索結果からナレッジオブジェクトの配列を取得
            // searchResults[1]: 2番目のオブジェクトタイプ（Knowledge__kav）の検索結果
            // (List<Knowledge__kav>): 型キャストでナレッジオブジェクトのリストとして扱う
            List<Knowledge__kav> knowledgeArticles = (List<Knowledge__kav>) searchResults[1];
            
            // ========================================
            // CaseレコードのSearchResultオブジェクトへの変換
            // ========================================
            
            // 検索結果の各Caseレコードをループ処理
            // for-each文: casesリストの各要素をcaseRecordとして順次取得
            for (Case caseRecord : cases) {
                // CaseオブジェクトをSearchResultオブジェクトに変換してresultsリストに追加
                // これにより、統一されたデータ構造で検索結果を管理可能
                results.add(new SearchResult(
                    caseRecord.Id,           // CaseのID（Salesforceの一意識別子）
                    caseRecord.Subject,      // Caseの件名（お問い合わせのタイトル）
                    caseRecord.Description,  // Caseの説明（お問い合わせの詳細内容）
                    'Case',                  // オブジェクトタイプ（固定値：Caseを識別）
                    caseRecord.Type,         // Caseのタイプ（問い合わせの種類：技術サポート、バグ報告等）
                    null                     // URL名（Caseには該当なし、ナレッジ記事のみ使用）
                ));
            }
            
            // ========================================
            // ナレッジレコードのSearchResultオブジェクトへの変換
            // ========================================
            
            // 検索結果の各ナレッジレコードをループ処理
            // for-each文: knowledgeArticlesリストの各要素をknowledgeRecordとして順次取得
            for (Knowledge__kav knowledgeRecord : knowledgeArticles) {
                // ナレッジオブジェクトをSearchResultオブジェクトに変換してresultsリストに追加
                // これにより、統一されたデータ構造で検索結果を管理可能
                results.add(new SearchResult(
                    knowledgeRecord.Id,           // ナレッジのID（Salesforceの一意識別子）
                    knowledgeRecord.Title,        // ナレッジのタイトル（記事のタイトル）
                    '',                           // ナレッジの概要（空文字）
                    'Knowledge',                  // オブジェクトタイプ（固定値：Knowledgeを識別）
                    'マニュアル',                  // ナレッジのタイプ（固定値：マニュアル）
                    knowledgeRecord.UrlName       // URL名（ナビゲーション用のURL識別子）
                ));
            }
            
            // ========================================
            // デモ用サンプルデータの追加
            // ========================================
            // 注意: 実際の本番環境では、これらのサンプルデータは削除し、
            // 実際のナレッジ記事（Knowledge__kav）やカスタムオブジェクトから
            // データを取得するように実装を変更する必要がある
            
            // マニュアル記事のサンプルデータ
            // 用途: システムの操作方法に関するドキュメント
            results.add(new SearchResult(
                'sample1',                              // サンプルID（実際のIDではない）
                'マニュアル: システム操作方法',           // タイトル（ユーザーに表示される）
                'システムの基本的な操作方法について説明します。', // 概要（検索結果の説明文）
                'Knowledge',                            // タイプ（ナレッジ記事を識別）
                'マニュアル',                           // サブタイプ（ドキュメントの種類）
                'manual-system-operation'               // URL名（ナビゲーション用のURL識別子）
            ));
            
            // リリースノートのサンプルデータ
            // 用途: システムの更新情報や新機能の説明
            results.add(new SearchResult(
                'sample2',                              // サンプルID
                'リリースノート: バージョン2.0',         // タイトル
                '新機能とバグ修正について',               // 概要
                'Knowledge',                            // タイプ（ナレッジ記事）
                'リリースノート',                       // サブタイプ
                'release-notes-v2'                     // URL名（ナビゲーション用）
            ));
            
            // お知らせのサンプルデータ
            // 用途: システムメンテナンスや重要な通知
            results.add(new SearchResult(
                'sample3',                              // サンプルID
                'お知らせ: メンテナンス予定',            // タイトル
                'システムメンテナンスのお知らせ',         // 概要
                'Announcement',                         // タイプ（お知らせを識別）
                'お知らせ',                            // サブタイプ
                null                                    // URL名（お知らせにはURL名なし）
            ));
            
        } catch (Exception e) {
            // ========================================
            // エラーハンドリング処理
            // ========================================
            
            // デバッグログにエラー情報を出力
            // System.debug(): Salesforceのデバッグログにメッセージを記録
            // 開発者コンソールやログファイルで確認可能
            System.debug('検索エラー: ' + e.getMessage());
            
            // AuraHandledExceptionをスローしてLightning Web Componentにエラーを伝達
            // AuraHandledException: LWCで適切にキャッチできる例外クラス
            // 通常のExceptionとは異なり、ユーザーに表示可能なエラーメッセージを提供
            // エラーメッセージは日本語で分かりやすく記述
            throw new AuraHandledException('検索中にエラーが発生しました: ' + e.getMessage());
        }
        
        // 検索結果のリストを返却
        // 正常終了時: 検索結果が格納されたSearchResultオブジェクトのリスト
        // エラー時: 上記のcatch文でAuraHandledExceptionがスローされるため、ここには到達しない
        return results;
    }
    
    /**
     * Caseとナレッジオブジェクトを検索するメソッド
     * 
     * 【機能概要】
     * - SOQL（Salesforce Object Query Language）を使用してCaseとナレッジオブジェクトを検索
     * - 件名（Subject）または説明（Description）での部分一致検索を実行
     * - 作成日時の降順でソートして最新のレコードを優先表示
     * - 検索結果をSearchResultオブジェクトのリスト形式で返却
     * 
     * 【技術詳細】
     * - @AuraEnabled: Lightning Web Componentから呼び出し可能
     * - cacheable=true: 同じパラメータでの再呼び出し時にキャッシュを使用
     * - SOQLクエリ: SOSLと異なり、特定のオブジェクトのみを対象とした検索
     * - 動的クエリ: Database.query()を使用して実行時にクエリを構築
     * 
     * 【処理フロー】
     * 1. 検索キーワードの有無をチェック
     * 2. WHERE句を動的に構築（キーワードがある場合のみ）
     * 3. SOQLクエリを構築（SELECT、WHERE、ORDER BY、LIMIT句）
     * 4. Database.query()でクエリを実行
     * 5. 検索結果をSearchResultオブジェクトに変換
     * 6. エラーハンドリング（AuraHandledExceptionでLWCにエラー伝達）
     * 
     * 【SOSLとの違い】
     * - SOSL: 複数オブジェクトを横断検索、全文検索機能
     * - SOQL: 単一オブジェクトの検索、より詳細な条件指定が可能
     * - 用途: 特定のオブジェクト（Case）に特化した検索に適している
     * 
     * @param searchKeyword 検索キーワード（件名または説明文で部分一致検索）
     *                      - nullや空文字の場合は全件検索
     *                      - LIKE演算子で部分一致検索を実行
     *                      - String.escapeSingleQuotes()でSQLインジェクション対策
     * @param limitNum 検索結果の最大件数
     *                 - パフォーマンス向上のため適切な値を設定推奨
     *                 - 大量のデータがある場合のメモリ使用量を制限
     * @return List<SearchResult> お問い合わせの検索結果を格納したSearchResultオブジェクトの配列
     *         - 空の場合は空のリストを返却
     *         - エラー時はAuraHandledExceptionをスロー
     * 
     * @throws AuraHandledException 検索処理中にエラーが発生した場合
     *         - エラーメッセージはLWCで表示可能
     *         - System.debug()でデバッグログにも出力
     */
    @AuraEnabled(cacheable=true) // キャッシュを有効にしてパフォーマンスを向上
    public static List<SearchResult> getInquiryList(String searchKeyword, Integer limitNum) {
        // 検索結果を格納するリストを初期化
        // List<SearchResult>: SearchResultオブジェクトの動的配列
        // 検索結果が0件の場合でも空のリストを返却するため、必ず初期化が必要
        List<SearchResult> results = new List<SearchResult>();
        
        try {
            // ========================================
            // Caseオブジェクトの検索処理
            // ========================================
            
            // WHERE句を格納する変数を初期化
            // 空文字で初期化することで、検索キーワードがない場合は全件検索となる
            String caseWhereClause = '';
            
            // 検索キーワードが指定されている場合のみWHERE句を構築
            // String.isNotBlank(): null、空文字、空白文字のみの文字列をチェック
            if (String.isNotBlank(searchKeyword)) {
                // 件名（Subject）または説明（Description）で部分一致検索を実行
                // LIKE演算子: パターンマッチングによる部分一致検索
                // '%' + keyword + '%': キーワードの前後に任意の文字列が存在することを許可
                // OR条件: SubjectまたはDescriptionのいずれかにキーワードが含まれていれば検索対象
                // String.escapeSingleQuotes(): シングルクォートをエスケープしてSQLインジェクション攻撃を防止
                caseWhereClause = 'WHERE (Subject LIKE \'%' + String.escapeSingleQuotes(searchKeyword) + '%\' OR ';
                caseWhereClause += 'Description LIKE \'%' + String.escapeSingleQuotes(searchKeyword) + '%\')';
            }
            
            // CaseオブジェクトのSOQLクエリを構築
            String caseQuery = 'SELECT Id, Subject, Description, Type, Status, CreatedDate FROM Case ' + caseWhereClause + ' ORDER BY CreatedDate DESC LIMIT ' + limitNum;
            
            // Caseレコードを取得
            List<Case> cases = Database.query(caseQuery);
            
            // 各CaseレコードをSearchResultオブジェクトに変換してリストに追加
            for (Case caseRecord : cases) {
                results.add(new SearchResult(
                    caseRecord.Id,           // CaseのID
                    caseRecord.Subject,      // Caseの件名
                    caseRecord.Description,  // Caseの説明
                    'Case',                  // オブジェクトタイプ（固定値）
                    caseRecord.Type,         // Caseのタイプ（問い合わせの種類）
                    null                     // URL名（Caseには該当なし）
                ));
            }
            
            // ========================================
            // ナレッジオブジェクトの検索処理
            // ========================================
            
            // ナレッジオブジェクトのWHERE句を構築
            String knowledgeWhereClause = 'WHERE PublishStatus = \'Online\'';
            
            // 検索キーワードが指定されている場合、タイトルまたは概要で検索
            if (String.isNotBlank(searchKeyword)) {
                knowledgeWhereClause += ' AND (Title LIKE \'%' + String.escapeSingleQuotes(searchKeyword) + '%\' OR ';
                knowledgeWhereClause += 'Summary LIKE \'%' + String.escapeSingleQuotes(searchKeyword) + '%\')';
            }
            
            // ナレッジオブジェクトのSOQLクエリを構築
            String knowledgeQuery = 'SELECT Id, Title, Summary, ArticleType, UrlName, CreatedDate FROM Knowledge__kav ' + knowledgeWhereClause + ' ORDER BY CreatedDate DESC LIMIT ' + limitNum;
            
            // ナレッジレコードを取得
            List<Knowledge__kav> knowledgeArticles = Database.query(knowledgeQuery);
            
            // 各ナレッジレコードをSearchResultオブジェクトに変換してリストに追加
            for (Knowledge__kav knowledgeRecord : knowledgeArticles) {
                results.add(new SearchResult(
                    knowledgeRecord.Id,           // ナレッジのID
                    knowledgeRecord.Title,        // ナレッジのタイトル
                    '',                           // ナレッジの概要（空文字）
                    'Knowledge',                  // オブジェクトタイプ（固定値）
                    'マニュアル',                  // ナレッジのタイプ（固定値：マニュアル）
                    knowledgeRecord.UrlName       // URL名（ナビゲーション用）
                ));
            }
            
        } catch (Exception e) {
            // エラーが発生した場合の処理
            System.debug('検索エラー: ' + e.getMessage()); // デバッグログにエラー内容を出力
            // AuraHandledExceptionをスローしてLightning Web Componentにエラーを伝達
            throw new AuraHandledException('検索中にエラーが発生しました: ' + e.getMessage());
        }
        
        // 検索結果のリストを返す
        return results;
    }
    
    /**
     * 検索結果を格納するための内部クラス
     * 
     * 【クラス概要】
     * - Lightning Web Componentで使用する検索結果の統一データ構造を定義
     * - 異なるオブジェクトタイプ（Case、Knowledge、Announcement等）の検索結果を
     *   統一された形式で管理するためのラッパークラス
     * - @AuraEnabledアノテーションにより、LWCから直接アクセス可能
     * 
     * 【設計思想】
     * - データの統一性: 異なるソースからの検索結果を同じ形式で扱う
     * - 拡張性: 新しいオブジェクトタイプの追加が容易
     * - 保守性: 検索結果の表示ロジックを一元化
     * 
     * 【使用場面】
     * - 検索結果の一覧表示
     * - 検索結果の詳細表示
     * - 検索結果のフィルタリング
     * - 検索結果のソート
     * - 検索結果のナビゲーション
     */
    public class SearchResult {
        /**
         * レコードの一意識別子
         * 
         * 【用途】
         * - Salesforceのレコードを一意に識別するID
         * - レコードの詳細表示や編集時の識別子として使用
         * - 検索結果の重複排除やソートのキーとして使用
         * 
         * 【形式】
         * - Salesforce標準ID形式（例: 500000000000000AAA）
         * - サンプルデータの場合は'sample1'等の文字列
         */
        @AuraEnabled public String Id;
        
        /**
         * 検索結果のタイトル
         * 
         * 【用途】
         * - 検索結果一覧で表示されるメインタイトル
         * - ユーザーが最初に目にする情報
         * - 検索結果のクリック可能なリンクテキスト
         * 
         * 【例】
         * - Case: "システムエラーについてのお問い合わせ"
         * - Knowledge: "マニュアル: システム操作方法"
         * - Announcement: "お知らせ: メンテナンス予定"
         */
        @AuraEnabled public String Title;
        
        /**
         * 検索結果の概要・説明文
         * 
         * 【用途】
         * - 検索結果の詳細説明や要約
         * - ユーザーが内容を理解するための補足情報
         * - 検索結果のプレビューとして表示
         * 
         * 【例】
         * - Case: "システムが正常に動作しない問題について..."
         * - Knowledge: "システムの基本的な操作方法について説明します。"
         * - Announcement: "システムメンテナンスのお知らせ"
         */
        @AuraEnabled public String Summary;
        
        /**
         * オブジェクトのタイプ
         * 
         * 【用途】
         * - 検索結果の種類を識別
         * - 表示スタイルやアイコンの決定
         * - フィルタリングやソートの基準
         * 
         * 【値の例】
         * - "Case": お問い合わせ
         * - "Knowledge": ナレッジ記事
         * - "Announcement": お知らせ
         * - "Document": ドキュメント
         */
        @AuraEnabled public String Type;
        
        /**
         * サブタイプ（詳細分類）
         * 
         * 【用途】
         * - 同一タイプ内での詳細分類
         * - より細かいフィルタリングやソート
         * - 表示スタイルの微調整
         * 
         * 【値の例】
         * - Case: "技術サポート", "バグ報告", "機能要求"
         * - Knowledge: "マニュアル", "リリースノート", "FAQ"
         * - Announcement: "お知らせ", "メンテナンス", "緊急連絡"
         */
        @AuraEnabled public String SubType;
        
        /**
         * ナビゲーション用のURL名
         * 
         * 【用途】
         * - 検索結果クリック時の遷移先URLを決定
         * - ナレッジ記事の詳細ページへの遷移
         * - 外部リンクやカスタムページへの遷移
         * 
         * 【値の例】
         * - ナレッジ記事: "manual-system-operation"
         * - リリースノート: "release-notes-v2"
         * - Case: null（CaseにはURL名なし）
         * 
         * 【注意】
         * - nullの場合はナビゲーション機能を使用しない
         * - 有効なURL名の場合は適切なページに遷移
         */
        @AuraEnabled public String UrlName;
        
        /**
         * SearchResultオブジェクトのコンストラクタ
         * 
         * 【機能概要】
         * - 検索結果の各プロパティを初期化
         * - オブジェクトの作成時に必要な値を設定
         * - データの整合性を保証
         * 
         * 【パラメータ詳細】
         * @param id レコードID
         *              - 必須パラメータ
         *              - 一意性を保証する必要がある
         *              - nullは許可しない（空文字は可）
         * 
         * @param title タイトル
         *              - 必須パラメータ
         *              - ユーザーに表示されるメイン情報
         *              - 検索結果の識別に重要
         * 
         * @param summary 概要・説明
         *              - 必須パラメータ
         *              - 検索結果の詳細情報
         *              - ユーザーの理解を助ける補足情報
         * 
         * @param type オブジェクトタイプ
         *              - 必須パラメータ
         *              - 検索結果の分類に使用
         *              - 表示ロジックの決定要因
         * 
         * @param subType サブタイプ
         *              - 必須パラメータ
         *              - より詳細な分類に使用
         *              - フィルタリングやソートに活用
         * 
         * @param urlName URL名（ナビゲーション用、null可）
         *              - オプションパラメータ
         *              - ナビゲーション機能を使用する場合のみ設定
         *              - nullの場合はナビゲーション機能を無効化
         */
        public SearchResult(String id, String title, String summary, String type, String subType, String urlName) {
            // レコードIDを設定
            // 検索結果の一意識別子として使用
            this.Id = id;
            
            // タイトルを設定
            // 検索結果一覧で表示されるメインタイトル
            this.Title = title;
            
            // 概要を設定
            // 検索結果の詳細説明や要約
            this.Summary = summary;
            
            // タイプを設定
            // 検索結果の種類を識別するための分類
            this.Type = type;
            
            // サブタイプを設定
            // より詳細な分類情報
            this.SubType = subType;
            
            // URL名を設定（nullの場合はnullのまま）
            // ナビゲーション機能を使用する場合のみ設定
            // nullの場合はナビゲーション機能を無効化
            this.UrlName = urlName;
        }
    }
}