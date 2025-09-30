public with sharing class ContactSupportCaseFormController {
    
    @AuraEnabled
    public static String createContentDocumentLinkWithCustomFields(
        Map<String, Object> newCase, 
        List<String> documents, 
        String resolutionDate, 
        String resolutionTime,
        String category,
        String expectedEffect,
        String implementationPeriod,
        String reporterName,
        String productErrorLocation,
        String bugOverview,
        String detailedContent,
        String environment,
        String occurrenceFrequency,
        String reproductionSteps,
        String expectedAction,
        String currentSituation
    ) {
        try {
            // ケースレコードを作成
            Case caseRecord = new Case();
            
            // 基本フィールドの設定
            caseRecord.Subject = (String) newCase.get('Subject');
            caseRecord.Description = (String) newCase.get('Description');
            caseRecord.Status = (String) newCase.get('Status');
            caseRecord.Priority = (String) newCase.get('Priority');
            caseRecord.Origin = (String) newCase.get('Origin');
            
            // カスタムフィールドの処理は一時的にコメントアウト
            // 基本的なケース作成をテストするため
            
            // 種別に応じて件名を設定
            if (String.isNotBlank(category)) {
                String categoryLabel = getCategoryLabel(category);
                caseRecord.Subject = '[' + categoryLabel + '] ' + caseRecord.Subject;
            }
            
            // 詳細内容をDescriptionに追加
            String description = caseRecord.Description;
            if (String.isNotBlank(detailedContent)) {
                description += '\n\n【詳細内容】\n' + detailedContent.replace('\n', '\n');
            }
            if (String.isNotBlank(bugOverview)) {
                description += '\n\n【不具合概要】\n' + bugOverview.replace('\n', '\n');
            }
            if (String.isNotBlank(environment)) {
                description += '\n\n【発生環境】\n' + environment.replace('\n', '\n');
            }
            if (String.isNotBlank(reproductionSteps)) {
                description += '\n\n【再現手順】\n' + reproductionSteps.replace('\n', '\n');
            }
            if (String.isNotBlank(expectedAction)) {
                description += '\n\n【期待される動作】\n' + expectedAction.replace('\n', '\n');
            }
            if (String.isNotBlank(currentSituation)) {
                description += '\n\n【現在の状況】\n' + currentSituation.replace('\n', '\n');
            }
            if (String.isNotBlank(reporterName)) {
                description += '\n\n【起票者】\n' + reporterName.replace('\n', '\n');
            }
            if (String.isNotBlank(productErrorLocation)) {
                description += '\n\n【製品/エラー発生箇所】\n' + productErrorLocation.replace('\n', '\n');
            }
            if (String.isNotBlank(occurrenceFrequency)) {
                description += '\n\n【発生頻度】\n' + occurrenceFrequency.replace('\n', '\n');
            }
            if (String.isNotBlank(expectedEffect)) {
                description += '\n\n【改善後のイメージ/期待効果】\n' + expectedEffect.replace('\n', '\n');
            }
            if (String.isNotBlank(implementationPeriod)) {
                description += '\n\n【導入希望時期】\n' + implementationPeriod.replace('\n', '\n');
            }
            
            caseRecord.Description = description;
            
            // 解決期限
            if (String.isNotBlank(resolutionDate)) {
                try {
                    String resolutionDateTime = resolutionDate;
                    if (String.isNotBlank(resolutionTime)) {
                        resolutionDateTime += ' ' + resolutionTime;
                    } else {
                        resolutionDateTime += ' 18:00:00';
                    }
                    caseRecord.put('ResolutionDateTime__c', DateTime.valueOf(resolutionDateTime));
                } catch (Exception e) {
                    // フィールドが存在しない場合は無視
                }
            }
            
            insert caseRecord;
            
            System.debug('Case created with ID: ' + caseRecord.Id);
            System.debug('Case Number after insert: ' + caseRecord.CaseNumber);
            
            // ケース番号を再取得（insert後に自動生成される）
            Case updatedCase = [SELECT Id, CaseNumber FROM Case WHERE Id = :caseRecord.Id LIMIT 1];
            System.debug('Case Number after requery: ' + updatedCase.CaseNumber);
            
            // ファイル添付の処理
            if (documents != null && !documents.isEmpty()) {
                List<ContentDocumentLink> links = new List<ContentDocumentLink>();
                for (String contentVersionId : documents) {
                    ContentDocumentLink link = new ContentDocumentLink();
                    link.LinkedEntityId = caseRecord.Id;
                    link.ContentDocumentId = getContentDocumentId(contentVersionId);
                    link.ShareType = 'V';
                    links.add(link);
                }
                if (!links.isEmpty()) {
                    insert links;
                }
            }
            
            System.debug('Returning Case Number: ' + updatedCase.CaseNumber);
            return updatedCase.CaseNumber;
            
        } catch (Exception e) {
            throw new AuraHandledException('エラーが発生しました: ' + e.getMessage());
        }
    }
    
    @AuraEnabled
    public static void deleteFileByVersionId(String contentVersionId) {
        try {
            Id contentDocumentId = getContentDocumentId(contentVersionId);
            delete [SELECT Id FROM ContentDocument WHERE Id = :contentDocumentId];
        } catch (Exception e) {
            throw new AuraHandledException('ファイル削除エラー: ' + e.getMessage());
        }
    }
    
    private static Id getContentDocumentId(String contentVersionId) {
        ContentVersion cv = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :contentVersionId LIMIT 1];
        return cv.ContentDocumentId;
    }
    
    private static String getCategoryLabel(String categoryValue) {
        Map<String, String> categoryMap = new Map<String, String>{
            'question' => '質問',
            'request' => '要望',
            'bug' => '不具合起票'
        };
        return categoryMap.get(categoryValue) != null ? categoryMap.get(categoryValue) : categoryValue;
    }
    
    private static String getImplementationPeriodLabel(String periodValue) {
        Map<String, String> periodMap = new Map<String, String>{
            'none' => '-なし-',
            '1month' => '1ヶ月以内',
            '3months' => '3ヶ月以内',
            '6months' => '6ヶ月以内',
            '1year' => '1年以内',
            'undecided' => '未定'
        };
        return periodMap.get(periodValue) != null ? periodMap.get(periodValue) : periodValue;
    }
    
}