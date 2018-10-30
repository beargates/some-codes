/**
 * 连连线小游戏
 */
import React, {Component} from 'react';
import _ from 'underscore';
import LineWithGame from './SingleLineGame';
import Hammer from '../../component/Hammer';

import './line-game.less';

/**
 * ^
 * |(1, 2)(2, 2)
 * |(1, 1)(2, 1)
 * |____________>
 */
// TODO pan事件绑定到整个game，而不是每个cell
class LineGame extends Component {
    constructor(props) {
        super(props);

        this.state = {
            lines: []
        };

        this.cellX = props.cell.x; // 格子数量
        this.cellY = props.cell.y;
        this.cellWidth = props.cell.width; // 格子宽度
        this.cellHeight = props.cell.height;
        // 所有点的集合
        // [[1, 2]...]
        this.allPoints = props.items.reduce((pre, next) => {
            return [...pre, next[0], next[1]];
        }, []);

        this.onTouchStart = this.onTouchStart.bind(this);
        this.onTouchMove = this.onTouchMove.bind(this);
        this.findLineDetails = this.findLineDetails.bind(this);
    }

    componentDidMount() {
        // TODO 页面滚动
        if (this.game) {
            const offset = this.game.getBoundingClientRect();
            this.containerX = offset.left;
            this.containerY = offset.top;
            this.containerHeight = offset.height;
        }
    }

    mapPropsToState(props) {
        let {answer} = props;

        if (!answer) {
            answer = [];
        }

        return {
            ...props,
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
        return this.state.lines;
    }

    cut(lines, point, ifCutCurrent) {
        return lines.map(_line => {
            let line = _line.points;
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
            return {
                ..._line,
                points: line,
            };
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
            const rightItem = after.points.filter(item => _.isEqual(item, point))[0];
            if (rightItem) {
                return [after];
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
            if (points.some(point => _.isEqual(after.points[0], point))) {
                return pre;
            }
            return [...pre, after];
        }, []);
    }

    onTouchStart(e) {
        const x = +e.target.getAttribute('data-x');
        const y = +e.target.getAttribute('data-y');
        const point = [x, y];
        let newLines = [...this.state.lines];
        let lastStartPoint = null;
        // 空数组表示没有找到对应的line
        const lineDetails = this.findLineDetails(this.props.items, point);
        const isEnds = !!lineDetails.length;
        if (isEnds) {
            // console.log('is ends');
            newLines = this.findOtherLines(this.state.lines, lineDetails[0].points);
            // 重新开始line
            newLines.push({
                points: [point],
                color: lineDetails[0].color,
            });
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
        // const event = e.touches[0];
        const event = e.changedPointers[0];
        // 数学中的坐标系
        const x = event.clientX - this.containerX;
        const y = this.containerHeight - (event.clientY - this.containerY);
        const cellX = Math.floor(x / this.cellWidth) + 1;
        const cellY = Math.floor(y / this.cellHeight) + 1;
        const point = [cellX, cellY];
        // 节流
        if (_.isEqual(point, this.state.lastPoint)) {
            return;
        }
        // 无效位置
        if (cellX <= 0 || cellX > this.cellX || cellY <= 0 || cellY > this.cellY) {
            return;
        }
        const targetLine = this.findLineDetails(this.state.lines, this.state.lastStartPoint);
        const line = targetLine.points;
        const _line = line.filter(_point => !_.isEqual(_point, point));
        const lastPoint = line[line.length - 1];
        let isDanger = false;
        if (lastPoint) {
            const deltaX = Math.abs(lastPoint[0] - point[0]);
            const deltaY = Math.abs(lastPoint[1] - point[1]);
            if (deltaX > 1 || deltaY > 1 || (deltaX === 1 && deltaY === 1)) {
                isDanger = true;
            }
        }
        const start = line[0];
        const lineDetails = this.findLineDetails(this.props.items, start);
        // 另外一端
        const anotherEnd = lineDetails.filter(item => Array.isArray(item) && !_.isEqual(item, start))[0];
        // 端点或者障碍物
        isDanger = isDanger || this.allPoints.some(_point => {
            return _.isEqual(_point, point)
                && !_.isEqual(_point, start)
                && !_.isEqual(_point, anotherEnd);
        });
        let reachEnd = line.some(point => _.isEqual(point, anotherEnd));
        if (line.some(_point => _.isEqual(_point, point))) {
            reachEnd = false;
        }
        if (!isDanger && !reachEnd) {
            let newLines = [...this.state.lines];
            // 过滤掉包含此line起点或终点的line
            const otherLines = this.findOtherLines(newLines, [lineDetails[0], lineDetails[1]]);
            // 阻断别的line
            newLines = this.cut(otherLines, point, true);
            if (_line.length === line.length) {
                // 前进
                line.push(point);
                newLines.push({
                    ...targetLine,
                    points: line,
                });
            } else {
                // 后退
                newLines = this.cut(this.state.lines, point);
            }
            this.compare(this.state.lines, newLines);
            this.setState({
                lastPoint: point
            });
        } else {
            console.log('error step', `isDanger: ${isDanger}`, `reachEnd: ${reachEnd}`);
        }
    }

    render() {
        // 所有点及点的颜色的集合
        // [{point: [1, 2], color: '#333'} ...]
        const allPoints = this.props.items.reduce((pre, next) => {
            return [...pre, {point: next[0], color: next[2]}, {point: next[1], color: next[2]}];
        }, []);
        const allEnds = this.props.items.map(item => {
            return {
                ...item,
                points: [item.points[0], item.points[item.points.length - 1]]
            }
        });
        // 所有带颜色的单元格
        const allCells = this.state.lines.reduce((pre, after) => {
            const color = this.findLineDetails(this.props.items, after[0])[2];
            return [...pre, ...after.reduce((prePoints, point) => {
                if (!point || !point.length) {
                    return prePoints;
                }
                return [...prePoints, [point[0], point[1], color]];
            }, [])];
        }, []);
        return <div className="game-line" ref={ref => this.game = ref}>
            {
                [...Array(this.cellX)].map((i, containerIndex) => {
                    return <div key={containerIndex} className="x-direction-container">
                        {
                            [...Array(this.cellY)].map((item, index) => {
                                const x = index + 1;
                                const y = this.cellY - containerIndex;
                                let isLineHere = false;
                                let bgColor = '';
                                let lineColor = '';
                                const isCircleHere = allPoints.some(pointInfo => {
                                    const isRightPoint = pointInfo.point[0] === x && pointInfo.point[1] === y;
                                    if (isRightPoint) {
                                        bgColor = pointInfo.color;
                                    }
                                    return isRightPoint;
                                });
                                const cellDetails = allCells.filter(point => point[0] === x && point[1] === y)[0];
                                if (cellDetails) {
                                    // style.backgroundColor = cellDetails[2];
                                    lineColor = cellDetails[2];
                                    isLineHere = true;
                                }
                                const lineStyle = {
                                    backgroundColor: lineColor
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
                                            lineStyle.transform = `translateX(${this.cellWidth / 2}px)`;
                                        } else {
                                            lineStyle.transform = `translateX(-${this.cellWidth / 2}px)`;
                                        }
                                    }
                                    if (Math.abs(deltaY) === 1) {
                                        if (deltaY === 1) {
                                            lineStyle.top = '-6px';
                                        } else {
                                            lineStyle.bottom = '-7px';
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
                                            width: this.cellWidth,
                                            height: this.cellHeight,
                                        }}
                                        data-x={x}
                                        data-y={y}
                                    >
                                        {
                                            isCircleHere ?
                                                <div className="circle" style={{backgroundColor: bgColor}}/> : null
                                        }
                                        {
                                            isLineHere && nextPoint ? <div className="line" style={lineStyle}/> : null
                                        }
                                    </div>
                                </Hammer>;
                            })
                        }
                    </div>;
                })
            }
        </div>;
    }
}

class Game extends Component {
    render() {
        const items = [
            [[1, 1], [3, 5], 'rgb(134, 202, 37)'],
            [[1, 2], [2, 5], 'rgb(121, 100, 225)'],
            [[3, 3], [4, 4], 'rgb(255, 190, 45)'],
            [[4, 1], [4, 5], 'rgb(103, 277, 242)'],
            [[3, 1], [4, 2], 'rgb(236, 55, 93)']
        ];
        const config = {
            bg: {
                backgroundColor: 'pink'
            },
            line: {
                backgroundColor: '#f45'
            },
            start: [1, 3],
            startConfig: {text: '1', color: 'green'},
            end: [5, 1],
            endConfig: {text: '8', color: 'green'},
            midPoints: [
                [3, 5, {text: '2', color: 'green'}],
                [1, 2, {text: '3', color: 'green'}],
                [4, 1, {text: '4', color: 'green'}],
                [3, 3, {text: '5', color: 'green'}],
                [4, 5, {text: '6', color: 'green'}],
                [5, 4, {text: '7', color: 'green'}]
            ],
            buildings: [
                [1, 5, {text: '障碍物', color: '#dedede'}]
            ]
        };
        // return <LineGame cell={5} items={items}/>;
        return <LineWithGame cell={5} config={config}/>;
    }
}

export default LineGame;
