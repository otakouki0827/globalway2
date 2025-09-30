/**
 * Class containing tests for ContactSupportCaseFormController
 */
@IsTest
public with sharing class ContactSupportCaseFormControllerTest {
    
    @testSetup
    static void setup() {

        Account testAccount;
        Contact testContact;
        // 管理者ユーザー（既存ユーザー）を取得
        User adminUser = [SELECT Id FROM User WHERE Profile.Name = 'システム管理者' AND IsActive = true AND UserRoleId != null LIMIT 1];
        System.runAs(adminUser){
            // 取引先（Account）作成
            testAccount = new Account(Name = 'Test Account');
            insert testAccount;

            // 取引先責任者（Contact）作成
            testContact = new Contact(FirstName = 'Taro', LastName = 'Yamada', AccountId = testAccount.Id);
            insert testContact;
        }
        
        //管理者ユーザーで実行
        System.runAs(adminUser){
            //ユーザーライセンス
            UserLicense ul = [SELECT Id,LicenseDefinitionKey FROM UserLicense WHERE LicenseDefinitionKey = 'PID_Customer_Community_Login' LIMIT 1];
            //ユーザー作成（サイトを利用する顧客のプロファイル）
            Profile pf = [SELECT Id,UserLicenseId FROM Profile WHERE UserLicenseId =: ul.Id LIMIT 1];
            //ユーザー
            User testUser = new User(
                Username = 'testuser' + Datetime.now().getTime() + '@example.com.test',
                Email = 'testuser@example.com',
                LastName = 'Test',
                Alias = 'tuser',
                TimeZoneSidKey = 'Asia/Tokyo',
                LocaleSidKey = 'ja_JP',
                LanguageLocaleKey = 'ja',
                EmailEncodingKey = 'UTF-8',
                ProfileId = pf.Id,
                ContactId = testContact.Id,
                IsActive = true
            );
            insert testUser;
            ContentVersion contentVersion1 = new ContentVersion(Title = 'TestFile1',PathOnClient = 'TestFile1.txt',VersionData = Blob.valueOf('test1'));
            insert contentVersion1;
        }

        //ファイル作成
        ContentVersion contentVersion2 = new ContentVersion(Title = 'TestFile2',PathOnClient = 'TestFile2.txt',VersionData = Blob.valueOf('test2'));
        insert contentVersion2;
        ContentVersion contentVersion3 = new ContentVersion(Title = 'TestFile3',PathOnClient = 'TestFile3.txt',VersionData = Blob.valueOf('test3'));
        insert contentVersion3;

    }

    @isTest
    static void testCreateContentDocumentLink(){
        User user = [SELECT Id, CreatedById FROM User WHERE Email = 'testuser@example.com'];
        List<ContentVersion> cvIds = [SELECT Id, OwnerId FROM ContentVersion];
        List<String> cvIdString1 = new List<String>();
        for(ContentVersion cvId : cvIds ) {
            cvIdString1.add(cvId.Id);
        }
        Case newCase = new Case(            
            Subject = 'testSubject',
            Description = 'testDescription',
            Status = '新規',
            Priority = '低',
            Origin = 'Web'
        );
        /* テストメソッド起動 */
        Test.startTest();
        //コミュニティユーザーで実行
        system.runAs(user){
            String result = ContactSupportCaseFormController.createContentDocumentLink(
                newCase,cvIdString1,'2025-08-23','18:00:00.000'
            );
            System.assertNotEquals(null, result);
        }

        User adminUser = [SELECT Id FROM User WHERE Id =:user.CreatedById];
        //アドミンユーザーで実行
        system.runAs(adminUser){
            Case newCase2 = new Case(            
                Subject = 'testSubject',
                Description = 'testDescription',
                Status = '新規',
                Priority = '低',
                Origin = 'Web'
            );
            String result = ContactSupportCaseFormController.createContentDocumentLink(
                newCase2,cvIdString1,'2025-08-23','18:00:00.000'
            );
            System.assertNotEquals(null, result);
        }
        //Exception
        try{
            ContactSupportCaseFormController.createContentDocumentLink(
                newCase,cvIdString1,'2025-08-23','18:00:00.000'
            );
            Assert.fail();
        }catch(Exception e){

            System.assert( e.getMessage().startsWith('Insert failed'));
        }

        Test.stopTest();
    }

    @isTest
    static void testFormatDateTime(){

        /* テストメソッド起動 */
        Test.startTest();
        DateTime result1 = ContactSupportCaseFormController.formatDateTime('','');
        DateTime result2 = ContactSupportCaseFormController.formatDateTime('2025-08-23','18:00:00.000');
        DateTime result3 = ContactSupportCaseFormController.formatDateTime('2025-08-23','');
        System.AssertEquals(null, result1);
        System.assertNotEquals(null, result2);
        System.assertNotEquals(null, result3);
        Test.stopTest();

    }

    @isTest
    static void deleteFileByVersionId(){

        /* テストメソッド起動 */
        //ファイル作成
        ContentVersion contentVersion = new ContentVersion(Title = 'TestFile4',PathOnClient = 'TestFile4.txt',VersionData = Blob.valueOf('test4'));
        insert contentVersion;
        ContentVersion cv = [SELECT Id FROM ContentVersion WHERE Title = 'TestFile4'];
        Test.startTest();
        
        ContactSupportCaseFormController.deleteFileByVersionId(cv.Id);
        List<ContentVersion> cvList = [SELECT Id FROM ContentVersion WHERE Title = 'TestFile4'];
        System.assertEquals(0, cvList.size());
        Test.stopTest();
        
        
    }

}