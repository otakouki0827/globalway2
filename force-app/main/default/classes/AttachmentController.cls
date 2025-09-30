public with sharing class AttachmentController {

    //ケース一時保管オブジェクトインサート
    @AuraEnabled
    public static ResponseDto InsertCaseTemp(CaseTemp__c caseTemp) {

        Id caseTempId = null;
        try{
            //ケースTemp保存
            insert caseTemp;
            System.debug('ケースIDできているか？：'+caseTemp.Id);
            caseTempId = caseTemp.Id;

        }catch(Exception e) {
            // エラーをレスポンス用のオブジェクトで返却
            return new ResponseDto('システムエラーが発生しました：' + e.getMessage(), caseTempId);
        }
        // 正常終了
        return new ResponseDto('正常終了', caseTempId);
    }
    //ケース登録
    //添付ファイルをケースへ紐づける
    //TODO:ファイルの所有者はどうなるのか？
    @AuraEnabled
    public static ResponseDto CreateContentDocumentLink(Case newCase, List<String> documents) {
        
        Id caseId = null;

        try{
            //ケース登録
            insert newCase;
            System.debug('ケースIDできているか？：'+newCase.Id);
            caseId = newCase.Id;
            //紐づけオブジェクト宣言
            List<ContentDocumentLink> newLinks = new List<ContentDocumentLink>();
            if(documents.size() > 0 && newCase.Id != null){
                //添付ファイル分ループ
                for(String docverId : documents) {
                    //ContentVersionIdを元に、CondentDocumentIdを取得
                    ContentVersion cv = [SELECT Id,ContentDocumentId FROM ContentVersion WHERE Id =:docverId Limit 1];
                    //if(cv.ContentDocumentId != null) continue;//IDがnullならスキップ
                    ContentDocumentLink newLink = new ContentDocumentLink(
                        ContentDocumentId = cv.ContentDocumentId,
                        LinkedEntityId = newCase.Id,//発番されたケースID
                        Visibility = 'AllUsers',//外部ユーザーは Visibility を AllUsers にのみ設定可。
                        ShareType = 'V'//閲覧者権限
                    );
                    System.debug('コンテントDocLinkIDできているか？：'+cv.ContentDocumentId);
                    newLinks.add(newLink);
                }
                insert newLinks;
                System.debug('コンテントDocLinkはインサートされたか？：'+newLinks);
            }
        } catch(Exception e) {
            // エラーをレスポンス用のオブジェクトで返却
            ResponseDto res = new ResponseDto('システムエラーが発生しました：' + e.getMessage(), caseId);
            return res;
        }
        
        // 正常終了としてレスポンス用のオブジェクト
        ResponseDto res = new ResponseDto('正常終了', caseId);
        return res;
    }

    //ケース登録前に画面遷移などした際の対象ファイル全削除
    @AuraEnabled
    public static void DeleteContentDocument(List<String> documents) {
        try{

            //Valid：IDが有効なものか
            List<Id> validIds = new List<Id>();
                for (String docId : documents) {
                    if (docId != null && docId.length() >= 15 && docId.length() <= 18) {
                        validIds.add((Id)docId);
                }
            }
            System.debug('validIds：'+validIds);
            //ファイル削除処理
            if(validIds.size() > 0 ){
                //添付ファイル分ループ
                List<ContentVersion> cvlist = [SELECT Id, ContentDocumentId FROM ContentVersion WHERE Id IN :validIds];
                List<Id> cvIdList = new List<Id>();
                for(ContentVersion cvId : cvlist){
                    cvIdList.add((Id)cvId.ContentDocumentId);
                }

                if(cvIdList.size() > 0)  delete [SELECT Id FROM ContentDocument WHERE Id IN :cvIdList];//ContentDocumentを削除
            }
        } catch(Exception e) {
            // エラーをレスポンス用のオブジェクトで返却
        }
        
        // 正常終了としてレスポンス用のオブジェクト
    }

    //ケース登録前に不要なファイルを×ボタンから削除した際の処理
    @AuraEnabled
    public static void deleteFileByVersionId(Id contentVersionId) {
        // ContentDocumentId を取得
        ContentVersion version = [SELECT Id, ContentDocumentId FROM ContentVersion WHERE Id = :contentVersionId LIMIT 1];
        delete [SELECT Id FROM ContentDocument WHERE Id =:version.ContentDocumentId];
    }


    //結果用のレスポンスクラス
    public class ResponseDto {
        @AuraEnabled public String message { get; set; }
        @AuraEnabled public Id id { get; set; }
        public ResponseDto(String msg, Id id){
            this.message = msg;
            this.id = id;
        }
    }
}