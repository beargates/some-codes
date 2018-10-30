import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import DOMGame from '../../component/DOMGame';
import Draggable from './Dragable';

import './style.less';

const distance = ({x: x1, y: y1}, {x: x2, y: y2}) => {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
};

class DragRotateGame extends Component {
    constructor(props) {
        super(props);

        this.state = {
            ...this.mapPropsToState(props),
        };

        this.init = this.init.bind(this);
        this.goToEnd = this.goToEnd.bind(this);
        this.calculatePosition = this.calculatePosition.bind(this);
    }

    componentDidMount() {
        // 禁止浏览器拖动资源文件，如img
        // const container = ReactDOM.findDOMNode(this);
        // if (container) {
        //     container.onmousedown = function (e) {
        //         e.preventDefault();
        //     };
        // }

        // 初始化_dragdata_和吸附等信息
        this.init();
    }

    init() {
        this.state.items.forEach((v, i) => this.calculatePosition(i));
    }

    mapPropsToState(props) {
        let {items, background, answer, assets, adsorbPoints} = props;
        // 将item按照answer进行排序，answer有序，item无序
        // 没有修改过的item排在前面
        if (answer) {
            let itemsNotInAnswer = items.filter(item => answer.every(answerItem => answerItem.index !== item.index));
            answer.forEach(answerItem => {
                const _item = items.filter(item => item.index === answerItem.index)[0];
                if (_item) {
                    itemsNotInAnswer.push(_item);
                }
            });
            items = itemsNotInAnswer;
        }
        items = items.map(({image, audio, origin, index, phase, ...rest}) => {
            const {
                meta: {
                    width,
                    height,
                }
            } = assets[image];
            const _item = {
                image: assets[image],
                audio: assets[audio],
                origin,
                index,
                phase,
                ...rest
            };
            let answerItem = null;
            if (answer) {
                answerItem = answer.filter(item => item.index === index)[0];
                if (answerItem) {
                    if (typeof answerItem.x === 'undefined' && answerItem.adsorbPointIndex) {
                        // 正确答案或用户答对的答案
                        const adsorbPoint = adsorbPoints.filter(item => item.index === answerItem.adsorbPointIndex)[0];
                        answerItem.x = adsorbPoint.x - width / 4;
                        answerItem.y = adsorbPoint.y - height / 4;
                    }
                    _item._dragData_ = {
                        tapCount: answerItem.rotation / phase,
                        rotation: answerItem.rotation,
                        x: answerItem.x,
                        y: answerItem.y,
                        lastDragDeltaX: answerItem.x - origin.x,
                        lastDragDeltaY: answerItem.y - origin.y,
                    };
                }
            }
            if (!answer || !answerItem) {
                _item._dragData_ = {
                    tapCount: 0,
                    rotation: 0,
                    x: origin.x,
                    y: origin.y,
                    lastDragDeltaX: 0,
                    lastDragDeltaY: 0,
                };
            }
            return _item;
        });

        return {
            ...props,
            items,
            background: assets[background] || null,
            answer
        };
    }

    componentWillReceiveProps(props) {
        this.setState({
            ...this.mapPropsToState(props),
        }, this.init);
    }

    replay() {
        this.setState({
            ...this.mapPropsToState(this.props),
        }, this.init);
    }

    getAnswer() {
        return this.state.items.map(item => {
            return {
                index: item.index,
                adsorbPointIndex: item._dragData_.adsorbPointIndex,
                rotation: item._dragData_.rotation,
                x: item._dragData_.x,
                y: item._dragData_.y,
            }
        })
    }

    /**
     * 计算是否在正确区域内，并吸附（错误的旋转角度亦可吸附）
     * @param itemIndex
     */
    calculatePosition(itemIndex) {
        const items = [...this.state.items];
        const item = items[itemIndex];
        const {
            meta: {
                width,
                height,
            }
        } = item.image;

        let realPosition = {
            x: item._dragData_.x,
            y: item._dragData_.y,
        };
        let centerPosition = {
            x: realPosition.x + width / 4,
            y: realPosition.y + height / 4
        }; // 中心点位置
        const {adsorbPoints} = this.state; // 吸附点
        let adsorbPoint = null;
        let adsorbPointIndex = null;
        const distances = adsorbPoints.map(point => {
            return distance(point, centerPosition);
        });
        const allRightDistances = distances.filter(distance => {
            return distance <= 30;
        });
        if (allRightDistances.length) {
            adsorbPoint = adsorbPoints[distances.indexOf(Math.min(...allRightDistances))];
            adsorbPointIndex = adsorbPoint.index;
            const {_dragData_} = items[itemIndex];
            items[itemIndex]._dragData_ = {
                ..._dragData_,
                x: adsorbPoint.x - width / 4,
                y: adsorbPoint.y - height / 4,
                lastDragDeltaX: _dragData_.lastDragDeltaX + adsorbPoint.x - centerPosition.x, // 吸附产生的delta
                lastDragDeltaY: _dragData_.lastDragDeltaY + adsorbPoint.y - centerPosition.y,
            };
            centerPosition = adsorbPoint;
        }
        items[itemIndex]._dragData_.adsorbPointIndex = adsorbPointIndex;

        this.setState({items});
    }

    /**
     * 使指定item在数组最后一位（后渲染的item出现在最顶层）
     * @param index
     * @param callback
     */
    goToEnd(index, callback) {
        const items = this.state.items.filter((item, i) => i !== index);
        items.push(this.state.items[index]);
        this.setState({
            items
        }, callback);
    }

    onTap(e, index) {
        this.goToEnd(index, () => {
            const items = [...this.state.items];
            const item = items[items.length - 1];
            const itemDragData = item._dragData_;
            itemDragData.tapCount++;
            itemDragData.rotation = itemDragData.tapCount * item.phase;

            this.setState({
                items
            }, () => {
                this.calculatePosition(index);
            });
        });
    }

    onDrag(e, index) {
        const items = [...this.state.items];
        const itemDragData = items[index]._dragData_;
        const deltaX = e.deltaX + itemDragData.lastDragDeltaX;
        const deltaY = e.deltaY + itemDragData.lastDragDeltaY;
        items[index]._dragData_ = {
            ...itemDragData,
            deltaX,
            deltaY,
            x: items[index].origin.x + deltaX,
            y: items[index].origin.y + deltaY,
        };

        this.setState({
            items
        });
    }

    onDragStart(e, index) {
        this.goToEnd(index);
    }

    onDragEnd(e, index) {
        const items = [...this.state.items];
        const itemDragData = items[index]._dragData_;
        items[index]._dragData_ = {
            ...itemDragData,
            lastDragDeltaX: e.deltaX + itemDragData.lastDragDeltaX,
            lastDragDeltaY: e.deltaY + itemDragData.lastDragDeltaY,
        };

        this.setState({
            items
        }, () => {
            this.calculatePosition(index);
        });
    }

    render() {
        const {enable, width, height} = this.props;
        let {
            background,
            backgroundPosition,
            items,
            virtualTargetAreas,
            adsorbPoints,
            isPreview,
        } = this.state;
        const {
            meta: {
                width: bgWidth,
                height: bgHeight,
            }
        } = background;

        return <DOMGame
            className="game-drag-rotate"
            style={{
                top: backgroundPosition.y,
                left: backgroundPosition.x,
            }}
            enable={enable}
            width={width}
            height={height}
        >
            {
                virtualTargetAreas.map((item, index) => {
                    const {width, high: height, x: left, y: top} = item;

                    return <div
                        key={index}
                        className="virtual-target-area"
                        style={{
                            width, height, top, left,
                            opacity: isPreview ? 1 : 0,
                        }}
                    />;
                })
            }
            <div
                className="game-drag-rotate-background"
                style={{
                    backgroundImage: `url(${background.url})`,
                    width: bgWidth / 2,
                    height: bgHeight / 2,
                }}
            >
                {
                    items.map((item, index) => {
                        const {
                            image,
                            _dragData_: {rotation, x, y}
                        } = item;

                        return <img
                            key={index}
                            className="game-drag-rotate-image"
                            src={image.url}
                            width={image.meta.width / 2}
                            height={image.meta.height / 2}
                            style={{
                                transform: `translate(${x}px, ${y}px) scaleZ(1) rotate(${rotation}deg)`,
                                // 2倍图尺寸的一半即旋转对象的中心
                                transformOrigin: `${image.meta.width / 4}px ${image.meta.height / 4}px`,
                            }}
                        />
                    })
                }
            </div>
            <svg
                className="game-drag-rotate-board"
                width={width}
                height={height}
            >
                {
                    items.map((item, index) => {
                        const {
                            image,
                            _dragData_: {rotation, x, y}
                        } = item;
                        return <Draggable
                            key={item.index}
                            className="game-drag-rotate-item"
                            style={{
                                transform: `translate(${x}px, ${y}px) scaleZ(1) rotate(${rotation}deg)`,
                                // 2倍图尺寸的一半即旋转对象的中心
                                transformOrigin: `${image.meta.width / 4}px ${image.meta.height / 4}px`,
                            }}
                            image={image}
                            x={x}
                            y={y}
                            onTap={e => this.onTap(e, index)}
                            onDrag={e => this.onDrag(e, index)}
                            onDragStart={e => this.onDragStart(e, index)}
                            onDragEnd={e => this.onDragEnd(e, index)}
                        />
                    })
                }
            </svg>
            {
                adsorbPoints.map((item, index) => {
                    const style = {
                        top: item.y - 3,
                        left: item.x - 3,
                        opacity: isPreview ? 1 : 0,
                    };
                    return <i key={index} className="adsorb-point" style={style}/>
                })
            }
        </DOMGame>
    }
}

export default DragRotateGame;
