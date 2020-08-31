import * as React from "react";
import {Popover, Upload, Tooltip, message} from "antd";
import {PPTProgressPhase, UploadManager} from "@netless/oss-upload-manager";
import { v4 as uuidv4 } from "uuid";
import * as OSS from "ali-oss";
import {Room} from "white-web-sdk";
import TopLoadingBar from "@netless/loading-bar";
import "./index.less";
import * as more from "./image/more.svg";
import * as Video from "./image/video.svg";
import * as Audio from "./image/audio.svg";
import * as moreActive from "./image/more-active.svg";
type OSSConfigObjType = {
    accessKeyId: string;
    accessKeySecret: string;
    region: string;
    bucket: string;
    folder: string;
    prefix: string;
};
export type PluginCenterProps = {
    room: Room,
    oss: OSSConfigObjType,
};

export type PluginCenterStates = {
    isActive: boolean,
    ossPercent: number,
    uploadState: PPTProgressPhase,
};

export default class PluginCenter extends React.Component<PluginCenterProps, PluginCenterStates> {
    private readonly client: any;
    private readonly uploadManager: UploadManager;
    public constructor(props: PluginCenterProps) {
        super(props);
        this.state = {
            isActive: false,
            ossPercent: 0,
            uploadState: PPTProgressPhase.Stop,
        };
        this.client = new OSS({
            accessKeyId: props.oss.accessKeyId,
            accessKeySecret: props.oss.accessKeySecret,
            region: props.oss.region,
            bucket: props.oss.bucket,
        });
        this.uploadManager = new UploadManager(this.client, props.room)
    }
    private handleVisibleChange = (event: boolean): void => {
        this.setState({isActive: event})
    }

    private progress = (phase: PPTProgressPhase, percent: number): void => {
        this.setState({uploadState: phase});
        switch (phase) {
            case PPTProgressPhase.Uploading: {
                this.setState({ossPercent: percent * 100});
                break;
            }
        }
    }

    public componentDidUpdate(prevProps: Readonly<PluginCenterProps>, prevState: Readonly<PluginCenterStates>, snapshot?: any) {
        if (this.state.uploadState !== prevState.uploadState) {
            if (this.state.uploadState === PPTProgressPhase.Uploading) {
                message.destroy();
                message.loading(`正在上传`, 0);
            } else {
                message.destroy();
            }
        }
    }

    private getUrl = async (event: any): Promise<string> => {
        const res = await this.uploadManager.addFile(`${uuidv4()}/${event.file.name}`, event.file, this.progress);
        const isHttps = res.indexOf("https") !== -1;
        let url;
        if (isHttps) {
            url = res;
        } else {
            url = res.replace("http", "https");
        }
        return url;
    }

    private uploadVideo = async (event: any): Promise<void> => {
        try {
            const url = await this.getUrl(event);
            if (url) {
                this.props.room.insertPlugin("video", {
                    originX: 0,
                    originY: 0,
                    width: 480,
                    height: 270,
                    attributes: {
                        pluginVideoUrl: url,
                    },
                });
            }
        } catch (err) {
            console.log(err);
        }
    }

    private uploadAudio = async (event: any): Promise<void> => {
        try {
            const url = await this.getUrl(event);
            if (url) {
                this.props.room.insertPlugin("audio", {
                    originX: 0,
                    originY: 0,
                    width: 480,
                    height: 86,
                    attributes: {
                        pluginAudioUrl: url,
                    },
                });
            }
        } catch (err) {
            console.log(err);
        }
    }

    private renderUploadButton = (): React.ReactNode => {
        return (
            <div className="oss-upload-box">
                <Upload
                    accept={"video/mp4"}
                    showUploadList={false}
                    customRequest={this.uploadVideo}>
                    <div className="oss-upload-section">
                        <div className="oss-upload-section-inner">
                            <div className="oss-upload-title-section">
                                <div className="oss-upload-title">上传视频</div>
                                <div className="oss-upload-icon">
                                    <img src={Video}/>
                                </div>
                            </div>
                            <div className="oss-upload-section-script">
                                <div className="oss-upload-section-text">支持 MP4 格式</div>
                            </div>
                        </div>
                    </div>
                </Upload>
                <div style={{width: 208, height: 0.5, backgroundColor: "#E7E7E7"}}/>
                <Upload
                    accept={"audio/mp3"}
                    showUploadList={false}
                    customRequest={this.uploadAudio}>
                    <div className="oss-upload-section">
                        <div className="oss-upload-section-inner">
                            <div className="oss-upload-title-section">
                                <div className="oss-upload-title">上传音频</div>
                                <div className="oss-upload-icon">
                                    <img src={Audio}/>
                                </div>
                            </div>
                            <div className="oss-upload-section-script">
                                <div className="oss-upload-section-text">支持 MP3 格式</div>
                            </div>
                        </div>
                    </div>
                </Upload>
            </div>
        );
    }
    public render(): React.ReactNode {
        const {isActive, ossPercent} = this.state;
        return [
            <TopLoadingBar key={"plugin-center-loading"} loadingPercent={ossPercent}/>,
            <Popover key={"plugin-center-popover"} trigger="click"
                     onVisibleChange={this.handleVisibleChange}
                     placement={"leftBottom"}
                     content={this.renderUploadButton()}>
                <Tooltip title={"plugin"} placement={"right"}>
                    <div className="tool-box-cell-box-left">
                        <div className="tool-box-cell">
                            <img src={isActive ? moreActive: more}/>
                        </div>
                    </div>
                </Tooltip>
            </Popover>
        ];
    }
}