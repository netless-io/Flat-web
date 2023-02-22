import {
    AnimationMode,
    ApplianceNames,
    createPPTTask,
    PPTKind,
    Room,
    SceneDefinition
} from "white-web-sdk";
import {v4 as uuidv4} from "uuid";
import {MultipartUploadResult} from "ali-oss";
import TaskOperator from "./fetch-middleware";
import * as default_cover from "./image/default_cover.svg";

export type PPTDataType = {
    active: boolean,
    pptType: PPTKind,
    id: string,
    data: any,
    cover?: string,
    zipUrl?: string,
};

export type imageSize = {
    width: number,
    height: number,
};
export type NetlessImageFile = {
    width: number;
    height: number;
    file: File;
    coordinateX: number;
    coordinateY: number;
};

export type TaskType = {
    uuid: string,
    imageFile: NetlessImageFile,
};

export type PPTProgressListener = (phase: PPTProgressPhase, percent: number) => void;

export enum PPTProgressPhase {
    Uploading,
    Converting,
    Stop,
}


export class UploadManager {
    private readonly task: TaskOperator;
    private readonly ossClient: any;
    private readonly room: Room;
    private readonly region?: string;

    public constructor(ossClient: any, room: Room, apiOrigin?: string, region?: string) {
        this.ossClient = ossClient;
        this.room = room;
        this.task = new TaskOperator(apiOrigin, region);
        this.region = region;
    }

    private getFileType = (fileName: string): string => {
        const index1 = fileName.lastIndexOf(".");
        return fileName.slice(index1);
    }

    public async uploadFile(rawFile: File, folder: string, uuid: string, onProgress?: PPTProgressListener): Promise<string> {
        const fileType = this.getFileType(rawFile.name);
        const path = `/${folder}/${uuid}${fileType}`;
        return this.addFile(path, rawFile, onProgress);
    }

    public async convertFile(
        rawFile: File,
        kind: PPTKind,
        folder: string,
        uuid: string,
        roomToken: string,
        onProgress?: PPTProgressListener,
    ): Promise<void> {
        const fileType = this.getFileType(rawFile.name);
        const path = `/${folder}/${uuid}${fileType}`;
        const pptURL = await this.addFile(path, rawFile, onProgress);

        const { taskUUID, taskToken } = await this.task.createTask(pptURL);
        const resp = createPPTTask({
            uuid: taskUUID,
            kind: kind,
            taskToken: taskToken,
            region: this.region,
            callbacks: {
                onProgressUpdated: progress => {
                    if (onProgress) {
                        onProgress(PPTProgressPhase.Converting, progress.convertedPercentage);
                    }
                },
                onTaskFail: () => {
                    if (onProgress) {
                        onProgress(PPTProgressPhase.Stop, 1);
                    }
                },
                onTaskSuccess: () => {
                    if (onProgress) {
                        onProgress(PPTProgressPhase.Stop, 1);
                    }
                },
            },
            checkProgressTimeout: 20 * 60 * 1000,
        });
        const ppt = await resp.checkUtilGet();
        await this.setUpScenes(ppt.scenes, uuid, kind, roomToken, taskUUID);
    }

    private setUpScenes = async (
        scenes: ReadonlyArray<SceneDefinition>,
        uuid: string,
        type: PPTKind,
        roomToken: string,
        taskUuid?: string,
    ): Promise<void> => {
        const sceneId = `${uuidv4()}`;
        this.room.putScenes(`/${uuid}/${sceneId}`, scenes);
        this.room.setScenePath(`/${uuid}/${sceneId}/${scenes[0].name}`);
        let res;
        try {
            res = await this.task.getCover(uuid, `/${uuid}/${sceneId}/${scenes[0].name}`, 192, 144, roomToken);
        } catch (error) {
            res = undefined;
        }

        const documentFile: PPTDataType = {
            active: true,
            id: sceneId,
            pptType: type,
            data: scenes,
            cover: res ? res.url : default_cover,
            zipUrl: taskUuid && `https://convertcdn.netless.link/${type === PPTKind.Dynamic ? "dynamicConvert" : "staticConvert"}/${taskUuid}.zip`,
        };
        const docs: PPTDataType[] = (this.room.state.globalState as any).docs;
        if (docs && docs.length > 0) {
            const oldDocs = docs.map(data => {
                data.active = false;
                return data;
            });
            const newDocs = [...oldDocs, documentFile];
            this.room.setGlobalState({docs: newDocs});
        }
        this.pptAutoFullScreen(this.room);
    }

    private pptAutoFullScreen = (room: Room): void => {
        const scene = room.state.sceneState.scenes[room.state.sceneState.index];
        if (scene && scene.ppt) {
            const width = scene.ppt.width;
            const height = scene.ppt.height;
            room.moveCameraToContain({
                originX: -width / 2,
                originY: -height / 2,
                width: width,
                height: height,
                animationMode: AnimationMode.Immediately,
            });
        }
    }

    private getImageSize = (imageInnerSize: imageSize): imageSize => {
        const windowSize: imageSize = {width: window.innerWidth, height: window.innerHeight};
        const widthHeightProportion: number = imageInnerSize.width / imageInnerSize.height;
        const maxSize: number = 960;
        if ((imageInnerSize.width > maxSize && windowSize.width > maxSize) || (imageInnerSize.height > maxSize && windowSize.height > maxSize)) {
            if (widthHeightProportion > 1) {
                return {
                    width: maxSize,
                    height: maxSize / widthHeightProportion,
                };
            } else {
                return {
                    width: maxSize * widthHeightProportion,
                    height: maxSize,
                };
            }
        } else {
            if (imageInnerSize.width > windowSize.width || imageInnerSize.height > windowSize.height) {
                if (widthHeightProportion > 1) {
                    return {
                        width: windowSize.width,
                        height: windowSize.width / widthHeightProportion,
                    };
                } else {
                    return {
                        width: windowSize.height * widthHeightProportion,
                        height: windowSize.height,
                    };
                }
            } else {
                return {
                    width: imageInnerSize.width,
                    height: imageInnerSize.height,
                };
            }
        }
    }

    public async uploadImageFiles(imageFiles: File[], x: number, y: number, onProgress?: PPTProgressListener, folder?: string): Promise<void> {
        const newAcceptedFilePromises = imageFiles.map(file => this.fetchWhiteImageFileWith(file, x, y));
        const newAcceptedFiles = await Promise.all(newAcceptedFilePromises);
        await this.uploadImageFilesArray(newAcceptedFiles, onProgress, folder);
    }

    private fetchWhiteImageFileWith(file: File, x: number, y: number): Promise<NetlessImageFile> {
        return new Promise(resolve => {
            const image = new Image();
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                image.src = reader.result as string;
                image.onload = async () => {
                    const res = this.getImageSize(image);
                    const imageFile: NetlessImageFile = {
                        width: res.width,
                        height: res.height,
                        file: file,
                        coordinateX: x,
                        coordinateY: y,
                    };
                    resolve(imageFile);
                };
            };
        });
    }

    private async uploadImageFilesArray(imageFiles: NetlessImageFile[], onProgress?: PPTProgressListener, folder?: string): Promise<void> {
        if (imageFiles.length > 0) {

            const tasks: { uuid: string, imageFile: NetlessImageFile }[] = imageFiles.map(imageFile => {
                return {
                    uuid: uuidv4(),
                    imageFile: imageFile,
                };
            });

            for (const {uuid, imageFile} of tasks) {
                const {x, y} = this.room.convertToPointInWorld({x: imageFile.coordinateX, y: imageFile.coordinateY});
                this.room.insertImage({
                    uuid: uuid,
                    centerX: x,
                    centerY: y,
                    width: imageFile.width,
                    height: imageFile.height,
                    locked: false,
                });
            }
            await Promise.all(tasks.map(task => this.handleUploadTask(task, onProgress, folder)));
            this.room.setMemberState({
                currentApplianceName: ApplianceNames.selector,
            });
        }
    }

    private async handleUploadTask(task: TaskType, onProgress?: PPTProgressListener, folder?: string): Promise<void> {
        const fileUrl: string = await this.addFile(`/${folder ? folder + '/' : ''}${task.uuid}${task.imageFile.file.name}`, task.imageFile.file, onProgress);
        this.room.completeImageUpload(task.uuid, fileUrl);
    }

    private getFile = (name: string): string => {
        return this.ossClient.generateObjectUrl(name);
    }
    public addFile = async (path: string, rawFile: File, onProgress?: PPTProgressListener): Promise<string> => {
        const res: MultipartUploadResult = await this.ossClient.multipartUpload(
            path,
            rawFile,
            {
                progress: (p: any) => {
                    if (onProgress) {
                        onProgress(PPTProgressPhase.Uploading, p);
                    }
                },
            });
        if (onProgress) {
            onProgress(PPTProgressPhase.Stop, 1);
        }
        if (res.res.status === 200) {
            return this.getFile(path);
        } else {
            throw new Error(`upload to ali oss error, status is ${res.res.status}`);
        }
    }
}
