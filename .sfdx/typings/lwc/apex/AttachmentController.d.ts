declare module "@salesforce/apex/AttachmentController.InsertCaseTemp" {
  export default function InsertCaseTemp(param: {caseTemp: any}): Promise<any>;
}
declare module "@salesforce/apex/AttachmentController.CreateContentDocumentLink" {
  export default function CreateContentDocumentLink(param: {newCase: any, documents: any}): Promise<any>;
}
declare module "@salesforce/apex/AttachmentController.DeleteContentDocument" {
  export default function DeleteContentDocument(param: {documents: any}): Promise<any>;
}
declare module "@salesforce/apex/AttachmentController.deleteFileByVersionId" {
  export default function deleteFileByVersionId(param: {contentVersionId: any}): Promise<any>;
}
