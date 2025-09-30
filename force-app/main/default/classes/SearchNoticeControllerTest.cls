/**
 * Class containing tests for SearchNoticeController
 */
@IsTest
private class SearchNoticeControllerTest {
    @testSetup
    static void setup() {
        // レコードタイプIdの取得
        Id rtId = [
            SELECT Id FROM RecordType 
            WHERE DeveloperName != 'Knowledge' AND SObjectType = 'Knowledge__kav' Limit 1].Id;
        System.debug(rtId);
        // ナレッジ記事(Draft)の作成
        Knowledge__kav draft = new Knowledge__kav(
            Title = 'テスト記事',
            UrlName = 'test-url',
            Language = 'ja',
            RecordTypeId = rtId,
            IsVisibleInCsp = true
        );
        insert draft;
        System.debug(draft);
        // KnowledgeArticleIdを取り出す
        Knowledge__kav insertedVer = [
            SELECT Id ,KnowledgeArticleId 
            FROM Knowledge__kav 
            WHERE Id =: draft.Id LIMIT 1
        ];

        //　ナレッジ記事公開化する
        KbManagement.PublishingService.publishArticle(insertedVer.KnowledgeArticleId, true);
        System.debug(insertedVer);
        // ナレッジ記事公開を取り出す
        Knowledge__kav onlineVer = [
            SELECT Id ,PublishStatus, KnowledgeArticleId 
            FROM Knowledge__kav 
            WHERE KnowledgeArticleId =:insertedVer.KnowledgeArticleId AND PublishStatus = 'Online'
        ];
        System.debug(onlineVer);
        System.assertEquals('Online', onlineVer.PublishStatus, 'ナレッジ記事が公開となってません。');

        //トピック作成
        Topic topic = new Topic(Name = 'トピック01');
        insert topic;
        System.debug(topic);

        //トピック割り当て
        TopicAssignment topicAs = new TopicAssignment(
            EntityId = onlineVer.Id, 
            TopicId = topic.Id
        );
        insert topicAs;
        System.debug(topicAs);
    }

    @isTest
    static void testGetKnowledgeRecords(){
        /* テストメソッド起動 */
        Test.startTest();
        List<Map<String, Object>> result = SearchNoticeController.getKnowledgeRecords(1);
        Test.stopTest();
        System.assertEquals(1, result.size(), '取得された件数が期待値と一致しません');
    }
}