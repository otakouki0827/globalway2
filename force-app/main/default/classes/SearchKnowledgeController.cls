public with sharing class SearchKnowledgeController {
    /**
     * Knowledgeレコード取得
     * @param 
     * 
    */
    // データを取得
    @AuraEnabled(cacheable=true) 
    public static List<Map<String, Object>>  getKnowledgeRecords(Id topicId){
                List<TopicAssignment> records = [SELECT EntityId FROM TopicAssignment WHERE TopicId =:topicId  LIMIT 1000];
                system.debug(records);

                List<Id> ids = new List<Id>();
                for (TopicAssignment rec : records) {
                    ids.add(rec.EntityId);
                }

                List<Knowledge__kav> records2 = [
                    SELECT Id, CreatedDate, Title, ArticleCreatedDate, UrlName, LastPublishedDate, IsVisibleInCsp 
                    FROM Knowledge__kav 
                    WHERE PublishStatus = 'Online' AND RecordType.DeveloperName != 'Knowledge' 
                    AND IsVisibleInCsp = true AND Id IN :ids ORDER BY LastPublishedDate DESC  LIMIT 1000
                ];
                system.debug(records2);



                List<Map<String, Object>> resultList = new List<Map<String, Object>>();
                for (Knowledge__kav rec : records2) {
                    Map<String, Object> row = new Map<String, Object>();
                    row.put('Id', rec.Id);
                    row.put('Name', rec.Title);
                    resultList.add(row);
                }
            return resultList;
    }
}