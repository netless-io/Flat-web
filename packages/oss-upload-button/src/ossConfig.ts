export type OSSConfigObjType = {
    accessKeyId: string;
    accessKeySecret: string;
    region: string;
    bucket: string;
    folder: string;
    prefix: string;
};

export const ossConfigObj: OSSConfigObjType = {
    accessKeyId: "LTAI4Fv7DfKEtR347iL3uDmu",
    accessKeySecret: "ycdfrOnz0a3MbDzi9Px4fqhXfKWqsy",
    region: "oss-cn-hangzhou",
    bucket: "beings",
    folder: "test",
    prefix: "https://beings.oss-cn-hangzhou.aliyuncs.com/",
};
