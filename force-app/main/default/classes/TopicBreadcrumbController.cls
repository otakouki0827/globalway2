public with sharing class TopicBreadcrumbController {
    
    public class BreadcrumbItem {
        @AuraEnabled public String label;
        @AuraEnabled public String url;
        @AuraEnabled public String id;
        
        public BreadcrumbItem(String label, String url, String id) {
            this.label = label;
            this.url = url;
            this.id = id;
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<BreadcrumbItem> getTopicHierarchy(Id recordId) {
        List<BreadcrumbItem> breadcrumbs = new List<BreadcrumbItem>();

        // トピックの取得
        List<TopicAssignment> assignments = [
            SELECT Topic.Name, TopicId
            FROM TopicAssignment
            WHERE EntityId = :recordId
        ];

        for (TopicAssignment ta : assignments) {
            String topicName = ta.Topic.Name;
            String[] hierarchy = topicName.split(' > '); // 例: "製品 > モバイル > iPhone"

            String urlBase = '/topics/';
            for (Integer i = 0; i < hierarchy.size(); i++) {
                String label = hierarchy[i];
                String url = urlBase + EncodingUtil.urlEncode(label, 'UTF-8');
                breadcrumbs.add(new BreadcrumbItem(label, url, String.valueOf(i)));
            }
        }

        return breadcrumbs;
    }
}