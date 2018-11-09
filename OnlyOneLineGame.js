/**
 * 一笔规划题（一笔画）
 */
import React, {Component} from 'react';
import Hammer from '../../component/Hammer';
import DOMGame from '../../component/DOMGame';
import _ from 'underscore';

import './only-one-line-game.less';

const distance = ([x1, y1], [x2, y2]) => {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
};

// 展开一个二维数组
const spreadArray = (array) => {
    return array.reduce((pre, next) => [...pre, ...next], []);
};

// 比较两个数组是否相等，比如[[1, 1], [2, 2]] === [[2, 2], [1, 1]]为true
const isEqual = (arr1, arr2) => {
    arr1 = [...arr1];
    arr2 = [...arr2];
    return _.isEqual(arr1, arr2)
        || _.isEqual(arr1, arr2.reverse());
};
// 比较两个数组不相等
const isNotEqual = (arr1, arr2) => {
    arr1 = [...arr1];
    arr2 = [...arr2];
    return !_.isEqual(arr1, arr2)
        && !_.isEqual(arr1, arr2.reverse());
};

class OnlyOneLineGame extends Component {
    constructor(props) {
        super(props);

        this.state = {
            ...this.mapPropsToState(this.props),
        };
        this.lineWidth = 5;
        this.ratio = 2;
        this.pointRadius = 7;

        this.onPan = this.onPan.bind(this);
        this.onPanStart = this.onPanStart.bind(this);
        this.drawLines = this.drawLines.bind(this);
        this.onCancel = this.onCancel.bind(this);
    }

    componentWillReceiveProps(props) {
        this.setState({
            ...this.mapPropsToState(props),
        }, this.renderCanvas);
    }

    mapPropsToState(props) {
        let {lines, answer, background, assets} = props;

        if (answer) {
            lines = answer;
        } else {
            lines = [];
        }

        return {
            ...props,
            start: null,
            lines,
            virtualLine: null,
            allPoints: spreadArray(props.lines),
            background: assets[background.index] || null
        }
    }

    replay() {
        this.setState({
            ...this.mapPropsToState(this.props),
        }, this.renderCanvas);
    }

    getAnswer() {
        return this.state.lines;
    }

    drawLine(ctx, line, options = {}) {
        if (!line.length || line.length < 2) {
            return;
        }

        line = line.map(point => point.map(x => x * this.ratio));

        const {
            width = this.lineWidth,
            strokeStyle = 'rgb(0, 123, 255)',
        } = options;

        ctx.beginPath();

        ctx.lineWidth = width * this.ratio;
        ctx.strokeStyle = strokeStyle;
        ctx.moveTo(...line[0]);
        ctx.lineTo(...line[1]);

        ctx.stroke();
    }

    drawPoint(ctx, [x, y], options = {}) {
        const {
            fillStyle = 'rgb(0, 123, 255)',
            borderWidth = 2,
            radius = this.pointRadius,
            borderColor = '#fff',
        } = options;

        x = x * this.ratio;
        y = y * this.ratio;

        ctx.beginPath();

        ctx.arc(x, y, radius * this.ratio, 0, Math.PI * 2);
        ctx.fillStyle = fillStyle;
        ctx.fill();

        ctx.lineWidth = borderWidth * this.ratio;
        ctx.strokeStyle = borderColor;
        ctx.stroke();
    }

    drawLines(lines, options) {
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
        this.ctx.shadowBlur = 2;
        lines.forEach(line => this.drawLine(this.ctx, line, options));
        this.ctx.restore(); // 去掉阴影
    }

    drawPoints(points, options) {
        points.forEach(point => this.drawPoint(this.ctx, point, options));
        this.ctx.restore();
    }

    /**
     * 在起点处画一个'S'
     */
    drawStartPoint() {
        let {virtualLine} = this.state;
        [
            ...this.state.lines,
            virtualLine || [],
        ].filter((v, i) => i === 0).forEach(line => {
            const start = line[0];
            if (start) {
                this.ctx.shadowColor = 'rgba(0, 0, 0, .8)';
                this.ctx.shadowOffsetX = 2;
                this.ctx.shadowOffsetY = 2;
                this.ctx.shadowBlur = 2;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.font = `${this.pointRadius * 2 * this.ratio * .9}px Arial`;
                this.ctx.fillStyle = '#fff';
                this.ctx.fillText('S', start[0] * this.ratio, start[1] * this.ratio);
                this.ctx.restore();
            }
        })
    }

    /**
     * 在阶段起始点画一个圈
     */
    drawStageStartCircle() {
        const start = this.getStartPoint();
        if (!start) {
            return;
        }
        let [x, y] = start;
        x = x * this.ratio;
        y = y * this.ratio;

        this.ctx.beginPath();

        this.ctx.arc(x, y, this.pointRadius * 1.8 * this.ratio, 0, Math.PI * 2);
        this.ctx.lineWidth = this.ratio;
        this.ctx.strokeStyle = 'rgb(0, 123, 255)';
        this.ctx.stroke();
    }

    renderCanvas() {
        const {lines, virtualLine, allPoints} = this.state;
        const linesStyle = {width: 12, strokeStyle: 'rgb(0, 123, 255, .6)'};
        const virtualLineStyle = {width: 12, strokeStyle: 'rgb(0, 123, 255, .6)'};

        // 清除整个画布
        this.ctx.clearRect(0, 0, 800 * this.ratio, 600 * this.ratio);
        this.drawLines(this.props.lines);
        this.drawLines(lines, linesStyle);
        this.drawStageStartCircle();
        if (virtualLine) {
            this.ctx.lineCap = 'round';
            this.drawLine(this.ctx, virtualLine, virtualLineStyle);
            this.ctx.restore();
        }
        this.drawPoints(allPoints);
        this.drawStartPoint();
    }

    /**
     * 初始化画布基本配置
     */
    init() {
        const {left, top} = this.canvas.getBoundingClientRect();
        this.ctx = this.canvas.getContext('2d');
        this.canvasX = left;
        this.canvasY = top;
    }

    componentDidMount() {
        this.init();
        this.renderCanvas();
    }

    /**
     * 获取点击的点（可以点击的点）
     * @param points 所有可以被点击的点
     * @param point 点击的真实坐标
     * @returns {*} 纠正过的点的坐标
     */
    getNearPoint(points, point) {
        const distances = points.map(_point => distance(_point, point));
        const threshold = this.pointRadius * 1.2; // 阈值
        let validDistances = distances.filter(distance => distance <= threshold);
        validDistances = validDistances.sort();
        const index = distances.indexOf(validDistances[0]);

        return points[index];
    }

    /**
     * 获取接下来可以链接成的线
     * @param currentPoint
     * @returns {*}
     */
    getNextLines(currentLines, currentPoint) {
        // 所有相关的线
        const maybeLines = this.props.lines.filter(line => {
            return line.some(point => _.isEqual(point, currentPoint));
        });

        // 过滤已经链接的线
        const nextLines = maybeLines.filter(line => {
            return currentLines.every(existLine => {
                return isNotEqual(existLine, line);
            });
        });

        return nextLines;
    }

    /**
     * 获取起点
     * 起点为最后画的线的末端或者虚拟线的起点
     * @param ifIncludeVirtualLine
     * @returns {*}
     */
    getStartPoint(ifIncludeVirtualLine = true) {
        let start = null;
        let {lines, virtualLine} = this.state;
        if (lines && lines[lines.length - 1]) {
            start = lines[lines.length - 1][1]; // 最后一条线的末端是下一条线的起点
        } else if (ifIncludeVirtualLine && virtualLine) {
            start = virtualLine[0];
        }
        return start;
    }

    onPanStart(e) {
        // 页面可能发生滚动，所以需要重新初始化配置
        this.init();

        let {allPoints, lines, virtualLine} = this.state;
        const x = e.center.x - e.deltaX - this.canvasX; // 触发panStart前点击的点的坐标
        const y = e.center.y - e.deltaY - this.canvasY;
        let start = this.getNearPoint(allPoints, [x, y]) || null;

        if (!virtualLine && start) {
            virtualLine = [start, start];

            let nextLines = this.getNextLines(lines, start);

            this.setState({
                nextLines,
                virtualLine
            });
        }
    }

    onPan(e) {
        let start = this.getStartPoint();
        if (!start) {
            return;
        }

        let {lines, allPoints} = this.state;
        const x = e.center.x - this.canvasX;
        const y = e.center.y - this.canvasY;
        const validPoints = allPoints.filter(point => !_.isEqual(point, start));
        const end = this.getNearPoint(validPoints, [x, y]) || null;

        if (end) {
            // 节流
            if (_.isEqual(end, start)) {
                return;
            }
            const tempLine = [start, end];
            // 不存在于已经画出的lines中
            const isNotExist = lines.every(existLine => {
                return isNotEqual(existLine, tempLine);
            });
            // 存在于给定的lines中
            const isExist = this.props.lines.some(existLine => {
                return isEqual(existLine, tempLine);
            });
            lines = [...lines];
            if (isNotExist && isExist) {
                lines.push(tempLine);
                start = end;

                // 重新计算可以形成的线
                let nextLines = this.getNextLines(lines, start);

                this.setState({
                    start,
                    lines,
                    nextLines,
                });
            }
        }

        this.setState({
            virtualLine: [start, [x, y]],
        }, this.renderCanvas);
    }

    onCancel() {
        let {lines} = this.state;

        let start = this.getStartPoint(false);
        if (start) {
            lines = [...lines];
            lines.pop();

            this.setState({
                lines,
                virtualLine: lines.length ? [start, start] : null,
            }, this.renderCanvas);
        }
    }

    render() {
        const {enable, assets, cancelButton} = this.props;
        const {
            background,
            backgroundPosition,
        } = this.state;
        const {
            meta: {
                width: bgWidth,
                height: bgHeight,
            }
        } = background;
        const width = bgWidth / 2;
        const height = bgHeight / 2;

        return <DOMGame
            style={{
                top: backgroundPosition.y,
                left: backgroundPosition.x,
            }}
            enable={enable}
            width={this.props.width}
            height={this.props.height}
        >
            <div
                className="game-only-one-line-container"
                style={{
                    backgroundImage: `url(${background.url})`,
                }}
            >
                <Hammer
                    onTap={this.onTap}
                    onPanStart={this.onPanStart}
                    onPan={this.onPan}
                    onPanEnd={this.onPanEnd}
                    direction="DIRECTION_ALL"
                >
                    <canvas
                        width={width * this.ratio}
                        height={height * this.ratio}
                        style={{
                            width,
                            height,
                        }}
                        ref={ref => this.canvas = ref}
                    />
                </Hammer>
                <button
                    className="btn-cancel"
                    onClick={this.onCancel}
                    style={{
                        width: cancelButton.width,
                        height: cancelButton.height,
                        top: cancelButton.y,
                        left: cancelButton.x,
                    }}
                />
            </div>
        </DOMGame>
    }
}

export default OnlyOneLineGame;
