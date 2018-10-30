/**
 * 用线连接两点（中间可能存在障碍物，或者需按规则经过某些点）
 */
import React, {Component} from 'react';
import _ from 'underscore';
import Hammer from '../../component/Hammer';
import DOMGame from '../../component/DOMGame';

import './line-game.less';

/**
 * ^
 * |(1, 2)(2, 2)
 * |(1, 1)(2, 1)
 * |____________>
 */
// TODO pan事件绑定到整个game，而不是每个cell
export default class LineGame extends Component {
    constructor(props) {
        super(props);

        this.state = {
            ...this.mapPropsToState(props),
        };

        this.onTouchStart = this.onTouchStart.bind(this);
        this.onTouchMove = this.onTouchMove.bind(this);
        this.findLineDetails = this.findLineDetails.bind(this);
        this.getAnswer = this.getAnswer.bind(this);
    }

    componentWillReceiveProps(props) {
        this.setState({
            ...this.mapPropsToState(props),
        });
    }

    mapPropsToState(props) {
        let {answer, background, assets} = props;

        if (!answer) {
            answer = [];
        } else {
            // 一个偷懒的处理方式
            // 由于保存给后端的answer的格式和本地使用的answer的格式存在冲突
            if (answer[0] && answer[0].points) {
                answer = answer.map(line => line.points.map(point => [point[0], point[1]]));
            }
        }

        return {
            ...props,
            background: assets[background.index] || null,
            cellX: props.cell.x, // 格子数量
            cellY: props.cell.y,
            cellWidth: props.cell.width, // 格子宽度
            cellHeight: props.cell.height,
            lines: answer
        };
    }

    replay() {
        this.setState({
            ...this.mapPropsToState(this.props),
        });
    }

    getAnswer() {
        console.log(this.state.lines);
        return this.state.lines.map((line) => {
            return {
                points: line,
                color: this.props.config.line.backgroundColor,
            }
        });
    }

    cut(lines, point, ifCutCurrent) {
        return lines.map(line => {
            let i = line.length - 1;
            const newLine = line.filter((item, index) => {
                const isSamePoint = _.isEqual(item, point);
                if (isSamePoint) {
                    i = index;
                }
                return isSamePoint;
            });
            if (newLine.length) {
                return line.splice(0, ifCutCurrent ? i : i + 1);
            }
            return line;
        });
    }

    compare(preLines, nextLines) {
        if (!_.isEqual(preLines, nextLines)) {
            this.setState({
                lines: nextLines
            });
        }
    }

    /**
     * 从给定的lines里面根据某个点，找到确定的某一个line
     * @param lines
     * @param point
     * @returns line
     */
    findLineDetails(lines, point) {
        return lines.reduce((pre, after) => {
            const rightItem = after.filter(item => _.isEqual(item, point))[0];
            if (rightItem) {
                return after;
            }
            return pre;
        }, []);
    }

    /**
     * 从给定的lines里面根据某些点(通常是一条线的起点和终点)，找到不包含此点的line
     * @param lines
     * @param points
     * @returns {*}
     */
    findOtherLines(lines, points) {
        return lines.reduce((pre, after) => {
            if (points.some(point => _.isEqual(after[0], point))) {
                return pre;
            }
            return [...pre, after];
        }, []);
    }

    onTouchStart(e) {
        const offset = e.target.getBoundingClientRect();
        this.startPointX = offset.left;
        this.startPointY = offset.top;
        this.containerHeight = offset.height;

        const x = +e.target.getAttribute('data-x');
        const y = +e.target.getAttribute('data-y');
        const point = [x, y];
        this.setState({
            lastStartPosition: point
        }); // 用于move时的位移计算

        let newLines = [...this.state.lines];
        let lastStartPoint = null;
        const {ends} = this.props.config;
        const isEnds = ends.some(end => _.isEqual(end, point));
        if (isEnds) {
            newLines = this.findOtherLines(this.state.lines, ends);
            // 重新开始line
            newLines.push([point]);
            lastStartPoint = point;
        } else {
            newLines = this.cut(newLines, point);
            lastStartPoint = this.findLineDetails(newLines, point)[0];
        }
        this.compare(this.state.lines, newLines);
        this.setState({
            lastPoint: point,
            // 锁定起点，用于touchMove时判定当前是在修改哪条line
            lastStartPoint: lastStartPoint || this.state.lastStartPoint
        });
    }

    onTouchMove(e) {
        const event = e.changedPointers[0];
        // 数学中的坐标系
        let x = event.clientX - this.startPointX;
        let y = this.startPointY - event.clientY;
        let cellX = Math.floor(x / this.state.cellWidth) + this.state.lastStartPosition[0];
        let cellY = Math.floor(y / this.state.cellHeight) + this.state.lastStartPosition[1] + 1;
        const point = [cellX, cellY];
        // 节流
        if (_.isEqual(point, this.state.lastPoint)) {
            return;
        }
        // 无效位置
        if (cellX <= 0 || cellX > this.state.cellX || cellY <= 0 || cellY > this.state.cellY) {
            return;
        }
        const {config} = this.props;
        const line = this.findLineDetails(this.state.lines, this.state.lastStartPoint);
        const _line = line.filter(_point => !_.isEqual(_point, point));
        const lastPoint = line[line.length - 1];
        let isDanger = false;
        if (lastPoint) {
            const deltaX = Math.abs(lastPoint[0] - point[0]);
            const deltaY = Math.abs(lastPoint[1] - point[1]);
            if (deltaX > 1 || deltaY > 1 || (deltaX === 1 && deltaY === 1)) {
                isDanger = true;
            }

            const start = line[0];
            const ends = config.ends;
            // 另外一端
            const anotherEnd = ends.filter(item => Array.isArray(item) && !_.isEqual(item, start))[0];
            // 端点或者障碍物
            isDanger = isDanger || config.buildings.some(building => _.isEqual(building, point));
            let reachEnd = line.some(point => _.isEqual(point, anotherEnd));
            if (line.some(_point => _.isEqual(_point, point))) {
                reachEnd = false;
            }
            if (!isDanger && !reachEnd) {
                let newLines = [...this.state.lines];
                // 过滤掉包含此line起点或终点的line
                const otherLines = this.findOtherLines(newLines, ends);
                // 阻断别的line
                newLines = this.cut(otherLines, point, true);
                if (_line.length === line.length) {
                    // 前进
                    line.push(point);
                    newLines.push(line);
                } else {
                    // 后退
                    newLines = this.cut(this.state.lines, point);
                }
                this.compare(this.state.lines, newLines);
                this.setState({
                    lastPoint: point
                });
            } else {
                console.log('error step');
            }
        }
    }

    render() {
        console.log(this.props);
        const {config, enable, width, height} = this.props;
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
        // 所有带颜色的单元格
        const allCells = this.state.lines.reduce((pre, after) => {
            const color = config.line.backgroundColor;
            return [...pre, ...after.reduce((prePoints, point) => {
                if (!point || !point.length) {
                    return prePoints;
                }
                return [...prePoints, [point[0], point[1], color]];
            }, [])];
        }, []);
        return <DOMGame
            style={{
                top: backgroundPosition.y,
                left: backgroundPosition.x,
            }}
            enable={enable}
            width={width}
            height={height}
        >
            <div
                className="game-line-with-container"
                style={{
                    backgroundImage: `url(${background.url})`,
                    width: bgWidth / 2,
                    height: bgHeight / 2,
                }}
            >
                <div
                    className="game-line-with"
                    ref={ref => this.game = ref}
                >
                    {
                        [...Array(this.state.cellX)].map((i, containerIndex) => {
                            return <div key={containerIndex} className="x-direction-container">
                                {
                                    [...Array(this.state.cellY)].map((item, index) => {
                                        const x = index + 1;
                                        const y = this.state.cellY - containerIndex;
                                        let pointInfo = null;
                                        const isElementHere = config.elements.some(el => {
                                            const {location} = el;
                                            const isCurrent = _.isEqual([location.x, location.y], [x, y]);
                                            if (isCurrent) {
                                                pointInfo = el;
                                            }
                                            return isCurrent;
                                        });
                                        const cellDetails = allCells.filter(point => point[0] === x && point[1] === y)[0];
                                        let isLineHere = !!cellDetails;
                                        const lineStyle = {
                                            backgroundColor: config.line.backgroundColor
                                        };
                                        const line = this.findLineDetails(this.state.lines, [x, y]);
                                        const pointIndex = _.findIndex(line, point => _.isEqual(point, [x, y]));
                                        // 后一个元素，决定当前线的方向及定位
                                        const nextPoint = line[pointIndex + 1];
                                        if (nextPoint) {
                                            const deltaX = nextPoint[0] - x;
                                            const deltaY = nextPoint[1] - y;
                                            if (Math.abs(deltaX) === 1) {
                                                if (deltaX === 1) {
                                                    lineStyle.transform = `translateX(${this.state.cellWidth / 2}px)`;
                                                } else {
                                                    lineStyle.transform = `translateX(-${this.state.cellWidth / 2}px)`;
                                                }
                                            }
                                            if (Math.abs(deltaY) === 1) {
                                                if (deltaY === 1) {
                                                    lineStyle.top = '-6px';
                                                } else {
                                                    lineStyle.bottom = '-6px';
                                                }
                                                lineStyle.transform = 'rotate(90deg)';
                                            }
                                        }
                                        return <Hammer
                                            key={index}
                                            onPanStart={this.onTouchStart}
                                            onPan={this.onTouchMove}
                                            direction="DIRECTION_ALL"
                                        >
                                            <div
                                                className="cell"
                                                style={{
                                                    width: this.state.cellWidth,
                                                    height: this.state.cellHeight,
                                                }}
                                                data-x={x}
                                                data-y={y}
                                            >
                                                {
                                                    isLineHere && nextPoint ?
                                                        <div className="line" style={lineStyle}/> : null
                                                }
                                                {
                                                    isElementHere ? <div
                                                        className="element"
                                                        style={{
                                                            width: this.state.cellWidth * .8,
                                                            height: this.state.cellHeight * .8,
                                                            backgroundImage: `url(${this.state.assets[pointInfo.index].url})`
                                                        }}
                                                    /> : null
                                                }
                                            </div>
                                        </Hammer>;
                                    })
                                }
                            </div>;
                        })
                    }
                </div>
            </div>
        </DOMGame>;
    }
}
