/**
 * 一笔规划题（一笔画）
 */
import React, {Component} from 'react';
import Hammer from '../../component/Hammer';
import _ from 'underscore';

const distance = ([x1, y1], [x2, y2]) => {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
};

// 展开一个二维数组
const spreadArray = (array) => {
    return array.reduce((pre, next) => [...pre, ...next], []);
};

class OnlyOneLineGame extends Component {
    constructor(props) {
        super(props);

        this.state = {
            start: null,
            lines: [],
            virtualLine: null,
            allPoints: spreadArray(this.props.lines)
        };
        this.lineWidth = 5;
        this.ratio = 2;
        this.pointRadius = 7;

        this.onPan = this.onPan.bind(this);
        this.onPanStart = this.onPanStart.bind(this);
        this.onPanEnd = this.onPanEnd.bind(this);
        this.drawLines = this.drawLines.bind(this);
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
                this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
                this.ctx.shadowOffsetX = 2;
                this.ctx.shadowOffsetY = 2;
                this.ctx.shadowBlur = 2;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.font = `100 ${this.pointRadius * 2 * this.ratio}px Arial`;
                this.ctx.fillStyle = '#fff';
                this.ctx.strokeText('S', start[0] * this.ratio, start[1] * this.ratio);
                this.ctx.restore();
            }
        })
    }

    renderCanvas() {
        const {lines, virtualLine, allPoints} = this.state;
        const linesStyle = {width: 12, strokeStyle: 'rgb(0, 123, 255, .6)'};
        const virtualLineStyle = {width: 12, strokeStyle: 'rgb(0, 123, 255, .6)'};

        // 清除整个画布
        this.ctx.clearRect(0, 0, 800 * this.ratio, 600 * this.ratio);
        this.drawLines(this.props.lines);
        this.drawLines(lines, linesStyle);
        if (virtualLine) {
            this.drawLine(this.ctx, virtualLine, virtualLineStyle);
        }
        this.drawPoints(allPoints);
        this.drawStartPoint();
    }

    componentDidMount() {
        const {left, top} = this.canvas.getBoundingClientRect();
        this.ctx = this.canvas.getContext('2d');
        this.canvasX = left;
        this.canvasY = top;

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
    getNextLines(currentPoint) {
        // 所有相关的线
        const maybeLines = this.props.lines.filter(line => {
            return line.some(point => _.isEqual(point, currentPoint));
        });

        // 过滤已经链接的线
        const nextLines = maybeLines.filter(line => {
            return this.state.lines.every(existLine => {
                return !_.isEqual(existLine, line) && !_.isEqual(existLine, line.reverse());
            });
        });

        return nextLines;
    }

    onPanStart(e) {
        let {start, allPoints, virtualLine} = this.state;
        const x = e.center.x - e.deltaX - this.canvasX; // 触发panStart前点击的点的坐标
        const y = e.center.y - e.deltaY - this.canvasY;
        if (virtualLine) {
            // 续接无效的line（virtualLine）
            start = virtualLine[0];
        } else {
            // 存在可续接line时不允许另起start点
            start = this.getNearPoint(allPoints, [x, y]) || null;
        }

        if (start) {
            let nextLines = this.getNextLines(start);

            this.setState({
                start,
                nextLines,
            });
        }
        // console.log(this.state.lines);
    }

    onPan(e) {
        let {start, lines, allPoints} = this.state;
        if (!start) {
            return;
        }

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
                return !_.isEqual(existLine, tempLine)
                    && !_.isEqual(existLine, tempLine.reverse());
            });
            // 存在于给定的lines中
            const isExist = this.props.lines.some(existLine => {
                return _.isEqual(existLine, tempLine)
                    || _.isEqual(existLine, tempLine.reverse());
            });
            lines = [...lines];
            if (isNotExist && isExist) {
                lines.push(tempLine);
                start = end;

                // 重新计算可以形成的线
                let nextLines = this.getNextLines(start);

                this.setState({
                    start,
                    lines,
                    nextLines,
                });
            }
        } else {
            this.setState({
                virtualLine: [start, [x, y]],
            }, this.renderCanvas);
        }
    }

    onPanEnd() {
        this.setState({
            start: null,
        });
    }

    render() {
        const width = 800;
        const height = 600;
        return <div>
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
                        height
                    }}
                    ref={ref => this.canvas = ref}
                />
            </Hammer>
        </div>
    }
}

class Game extends Component {
    render() {
        let lines = [
            [
                [3, 0],
                [1, 2]
            ],
            [
                [3, 0],
                [5, 2]
            ],

            [
                [1, 2],
                [2.5, 4]
            ],
            [
                [5, 2],
                [3.5, 4]
            ],
            [
                [2, 4],
                [2.5, 4]
            ],
            [
                [2.5, 4],
                [3.5, 4]
            ],
            [
                [3.5, 4],
                [4, 4]
            ],
            [
                [2, 4],
                [0, 6]
            ],
            [
                [4, 4],
                [6, 6]
            ],
            [
                [0, 6],
                [6, 6]
            ],
        ];
        lines = lines.map(line => line.map(point => point.map(x => x * 50 + 100)));
        return <OnlyOneLineGame lines={lines}/>;
    }
}

export default Game;
