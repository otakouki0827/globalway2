public with sharing class SearchNoticeController {

    /**
     * Knowledgeレコード取得
     * @param 
     * @return List<Map<String, Object>>
    */
    // お知らせ表示用データを取得
    @AuraEnabled(cacheable=true) 
    public static List<Map<String, Object>> getKnowledgeRecords(Integer limitNum) {
        
        //ナレッジデータ取得
        List<Knowledge__kav> records = 
        [
            SELECT CreatedDate, Title ,ArticleCreatedDate,UrlName,LastPublishedDate, IsVisibleInCsp
            FROM Knowledge__kav 
            WHERE PublishStatus = 'Online' AND RecordType.DeveloperName != 'Knowledge' AND IsVisibleInCsp = true
            ORDER BY LastPublishedDate DESC LIMIT :limitNum
        ];
        System.debug('records');
        System.debug(records);
        List<Id> knowledgeIds = new List<Id>();//ナレッジのIDリスト        
        for(Knowledge__kav knowledge : records){
            knowledgeIds.add(knowledge.Id);
        }
        //ナレッジに紐づくトピックを取得
        List<TopicAssignment> topicAssignmentRecords = 
        [
            SELECT CreatedDate, EntityType, EntityId, TopicId, Topic.Name 
            FROM TopicAssignment 
            WHERE  EntityId IN :knowledgeIds AND EntityType = 'Knowledge' 
            ORDER BY CreatedDate DESC
        ];
        System.debug('topicAssignmentRecords');
        System.debug(topicAssignmentRecords);
        Map<Id,List<String>> topicNameMap = new Map<Id,List<String>>();//ID,トピック名配列のMap
        Map<Id,List<Id>> topicIdMap = new Map<Id,List<Id>>();//ID,トピックID配列のMap
        for(TopicAssignment topicas : topicAssignmentRecords){
            Id recordId = topicas.EntityId;
            Id topicId = topicas.TopicId;
            String topicName = topicas.Topic.Name;
            if(!topicNameMap.containsKey(recordId)){
                topicNameMap.put(recordId, new List<String>());
                topicIdMap.put(recordId, new List<Id>());
            }
            topicNameMap.get(recordId).add(topicName);
            topicIdMap.get(recordId).add(topicId);
        }
        System.debug('topicNameMap');
        System.debug(topicNameMap);
        List<Map<String, Object>> resultList = new List<Map<String, Object>>();
        for (Knowledge__kav rec : records) {
            Map<String, Object> row = new Map<String, Object>();
            row.put('Id', rec.Id);
            row.put('LastPublishedDate', rec.LastPublishedDate.format('yyyy/MM/dd'));
            //タグ名とIdのマップをリスト化する。
            List<Map<String, Object>> tagList = new List<Map<String, Object>>();
            if (topicNameMap.containsKey(rec.Id) && topicIdMap.containsKey(rec.Id)) {
                List<String> names = topicNameMap.get(rec.Id);
                List<Id> ids = topicIdMap.get(rec.Id);
                for (Integer i = 0; i < names.size(); i++) {
                    tagList.add(new Map<String, Object>{'name' => names[i], 'id' => ids[i]});
                }
                row.put('Tag', topicNameMap.get(rec.Id) != null ? topicNameMap.get(rec.Id) : new List<String>());
                row.put('TopicId', topicIdMap.get(rec.Id) != null ? topicIdMap.get(rec.Id) : new List<Id>());
            }
            row.put('Tags', tagList);
            row.put('Name', rec.Title);
            row.put('UrlName', rec.UrlName);
            
            resultList.add(row);
        }

        return resultList;
    }
}