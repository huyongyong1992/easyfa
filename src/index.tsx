import * as React from 'react';
import parseAPNG from './apngjs/parser';
import { getImgBuffer } from './utils/imgTool';
import { APNG } from './apngjs/structs';
import Player from './apngjs/player';
import easyfaStyle from './style.css';

const { canvasBox, canvasPanel, showPanel } = easyfaStyle;

/**
 * [ApngComponent description]
 * @param {string} className canvas' className
 * @param {object} style canvas' style
 * @param {string} src apng's path
 * @param {number} rate apng play rate
 * @param {function} onClick bind animation's click event
 * @param {bool} autoPlay auto play apng
 * @extends React
 */

interface EasyfaProps {
    src: string[];
    rate?: number;
    autoPlay?: boolean;
    style?: {};
    className?: '';
}
interface EasyfaState {
    src: string[];
    rate: number;
    autoPlay: boolean;
    style?: {};
    className?: '';
    showLayer: number;
    loadDone: boolean;
}

class Easyfa extends React.Component<EasyfaProps, EasyfaState> {
    apng: APNG | Error = null;
    apngList: (APNG | Error)[] = [];
    canvas: HTMLCanvasElement = null;
    canvasList: HTMLCanvasElement[] = [];
    player: Player = null;
    playerList: Player[] = [];
    isPlay: boolean = false;
    hasPerformance: boolean = typeof performance !== 'undefined';
    speed: number = 1000 / 24;
    constructor(props: EasyfaProps) {
        super(props);
        const {
            src = [],
            rate = 1.0,
            autoPlay = false,
            style = {},
            className = ''
        } = props;
        this.state = {
            src,
            rate,
            autoPlay,
            style,
            className,
            showLayer: 0,
            loadDone: false
        };
        this.speed = 1000 / (rate * 24); //1000/24 每秒24帧
    }
    componentDidMount() {
        this.getImgData();
    }
    reset = (nextProps: EasyfaProps) => {
        const {
            src = [],
            rate = 1.0,
            autoPlay = false,
            style = {},
            className = ''
        } = nextProps;
        this.stop();
        this.apngList = [];
        this.playerList = [];
        this.canvasList = [];
        this.player = null;
        this.isPlay = false;
        this.setState(
            {
                src,
                rate,
                autoPlay,
                style,
                className,
                loadDone: false,
                showLayer: 0
            },
            () => {
                this.getImgData();
            }
        );
    };
    changeLayer = (layerIndex: number) => {
        this.setState({
            showLayer: layerIndex
        });
        this.player = this.playerList[layerIndex];
    };
    play = () => {
        if (!this.player) return;
        if (!this.player.paused) return;
        this.player.play();
        this.isPlay = true;
    };
    pause = () => {
        if (!this.player) return;
        this.player.pause();
        this.isPlay = false;
    };
    stop = () => {
        if (!this.player) return;
        this.player.stop();
        this.isPlay = false;
    };
    one = () => {
        this.player.one();
    };
    end = () => {
        this.player.end();
    };
    getImgData = () => {
        const { rate, src, autoPlay, showLayer } = this.state;
        const p = src.map(async (item, index) => {
            const data = await getImgBuffer(item);
            this.apngList[index] = parseAPNG(data);
            //错误检测
            if (this.apngList[index] instanceof Error) {
                console.log(this.apngList[index]);
                // handle error
                return;
            }
            //创建canvas播放器
            this.canvasList[index].width = (this.apngList[index] as APNG).width;
            this.canvasList[index].height = (this.apngList[
                index
            ] as APNG).height;
            const p = await (this.apngList[index] as APNG).getPlayer(
                this.canvasList[index].getContext('2d')
            );
            this.playerList[index] = p;
            this.playerList[index].playbackRate = rate;
            if (autoPlay) {
                this.playerList[index].play();
                this.isPlay = true;
            }
            this.playerList[index].on('end', () => {
                this.isPlay = false;
            });
            this.player = this.playerList[showLayer];
        });
        Promise.all(p).then(() => {
            this.setState({
                loadDone: true
            });
        });
    };
    componentWillReceiveProps(nextProps: EasyfaProps) {
        if (this.state.src !== nextProps.src) {
            this.reset(nextProps);
        }
    }
    componentWillUnmount() {
        if (this.player) {
            this.player.stop();
            this.player._apng = null;
        }
    }
    render() {
        const { style, className, src, showLayer, loadDone } = this.state;
        return (
            <div className={canvasBox}>
                {src.map((item, index) => (
                    <canvas
                        key={index}
                        ref={dom => (this.canvasList[index] = dom)}
                        style={style}
                        className={`${
                            index === showLayer && loadDone ? showPanel : ''
                        } ${canvasPanel} ${className}`}
                    />
                ))}
            </div>
        );
    }
}

export default Easyfa;
