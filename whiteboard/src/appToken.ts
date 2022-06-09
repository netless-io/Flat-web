export const netlessToken = {
    sdkToken: process.env.SDKTOKEN!,
    appIdentifier: process.env.APPIDENTIFIER!,
};

export type OSSConfigObjType = {
    region: string;
    bucket: string;
    folder: string;
    prefix: string;
};

export const ossConfigObj: OSSConfigObjType = {
    region: process.env.OSSREGION,
    bucket: process.env.BUCKET,
    folder: process.env.FOLDER,
    prefix: process.env.PREFIX,
};

export type H5OSSCOnfigObjType = {
    h5AccessKeyId: string;
    h5AccessKeySecret: string;
    h5Region: string;
    h5Bucket: string;
    h5Folder: string;
    h5SiteFolder: string;
    h5Prefix: string;
};

export const h5OssConfigObj = {
    h5AccessKeyId: process.env.H5AK!,
    h5AccessKeySecret: process.env.H5SK!,
    h5Region: process.env.H5REGION!,
    h5Bucket: process.env.H5BUCKET!,
    h5Folder: process.env.H5FOLDER!,
    h5SiteFolder: process.env.H5SITEFOLDER!,
    h5Prefix: process.env.H5PREFIX!,
    h5PrefixUs: "https://demo-h5-us.netless.group/",
};

export const h5DemoUrl = "https://demo-h5.netless.group/docs/";
export const h5DemoUrl2 = "https://demo-edu.cocos.com/agora-demo/index.html";
export const h5DemoUrl3 = "https://demo-h5.netless.group/dist2020/";
export const supplierUrl =
    "https://static.pre.wzomo.com/web/netless/index.html#/lesson1/page7?debug=1&role=teacher&origin=dev";
