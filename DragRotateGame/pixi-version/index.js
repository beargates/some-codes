import React, {Component} from 'react';
import {Stage} from 'react-pixi-fiber';
import DraggableContainer from './components/DraggableContainer';
import Sprite from './components/Sprite';
import Circle from './components/Circle';
import Util from './components/util';

import '../style.less';

const OPTIONS = {
    // backgroundColor: 0x1099bb,
    transparent: true,
    resolution: 2,
};

class PIXIVersion extends Component {
    draggableContainer = React.createRef();

    constructor(props) {
        super(props);

        this.state = {
            ...this.mapPropsToState(props),
        };
    }

    componentDidMount() {
        this.state.items.forEach(item => this.getImageData(item.image));
        this.stage._canvas.style.width = `${this.props.width}px`;
        this.stage._canvas.style.height = `${this.props.height}px`;
    }

    mapPropsToState(props) {
        let {items, background, answer, assets, adsorbPoints} = props;

        let result = {};
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
            // 如果答案里面没有配置该item，则取item的初试信息
            if (answer && answer[index]) {
                const answerItem = answer[index];
                const currentPosition = {};

                if (answerItem.adsorbPointIndex) {
                    // 正确答案或用户答对的答案
                    const adsorbPoint = adsorbPoints.filter(item => item.index === answerItem.adsorbPointIndex)[0];
                    currentPosition.x = adsorbPoint.x - width / 4;
                    currentPosition.y = adsorbPoint.y - height / 4;
                } else if (typeof answerItem.x !== 'undefined') {
                    // 用户作答错误数据
                    currentPosition.x = answerItem.x - width / 4;
                    currentPosition.y = answerItem.y - height / 4;
                } else {
                    currentPosition.x = origin.x;
                    currentPosition.y = origin.y;
                }

                _item._dragData_ = {
                    tapCount: answerItem.rotation / phase,
                    rotation: answerItem.rotation,
                    ...currentPosition,
                    lastDragDeltaX: currentPosition.x - origin.x,
                    lastDragDeltaY: currentPosition.y - origin.y,
                };
                result[index] = {
                    areaIndex: answerItem.areaIndex,
                    rotation: answerItem.rotation,
                };
            } else {
                result[index] = {
                    // areaIndex,
                    rotation: 0, // 初始旋转角度
                };
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
            result,
            answer,
            imageData: {},
        };
    }

    componentWillReceiveProps(props) {
        this.setState({
            ...this.mapPropsToState(props),
        }, () => {
            this.state.items.forEach(item => this.getImageData(item.image));
        });
    }

    replay() {
        this.setState({
            ...this.mapPropsToState(this.props),
        });
    }

    getAnswer() {
        // console.log(this.state.result);
        return this.state.result;
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
        let adsorbPointIndex = '';
        const distances = adsorbPoints.map(point => {
            return Util.distance(point, centerPosition);
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

        this.setState({
            items,
            result: {
                ...this.state.result,
                [item.index]: {
                    adsorbPointIndex,
                    rotation: item._dragData_.tapCount * item.phase,
                    ...centerPosition
                },
            }
        });
    }

    getPosition(item) {
        const {x, y, rotation} = item._dragData_;
        const {
            image: {
                meta: {
                    width,
                    height
                }
            }
        } = item;
        return {
            x,
            y,
            width: width / 2,
            height: height / 2,
            rotation,
            transformOrigin: {
                x: x + width / 2 / 2,
                y: y + height / 2 / 2,
            }
        }
    }

    getImageData(image) {
        return new Promise((resolve, reject) => {
            if (this.state.imageData[image.uuid]) {
                resolve(this.state.imageData[image.uuid]);
            } else {
                Util.getImageData(image)
                    .then((imageData) => {
                        this.setState({
                            imageData: {
                                ...this.state.imageData,
                                [image.uuid]: imageData
                            }
                        }, resolve);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            }
        });
    }

    getTargetIndex(e) {
        const {x, y} = e.data.global;
        const point = new PIXI.Point(x, y);
        const container = this.draggableContainer.current;
        const children = container.children.filter(child => child.containsPoint(point));
        let items = children.map(child => {
            // child(DisplayObject)对应的item
            const index = child.parent.getChildIndex(child);
            return this.state.items[index];
        });
        let index = null;

        // 透明部分不可点击
        if (1) {
            items = items.filter((item) => {
                let position = {x, y};
                let {rotation, transformOrigin} = this.getPosition(item);
                if (rotation) {
                    position = Util.getMappedPoint(position, transformOrigin, -rotation);
                }
                const positionInImage = {
                    x: position.x - item._dragData_.x,
                    y: position.y - item._dragData_.y,
                };
                const imageData = this.state.imageData[item.image.uuid];
                return Util.getRGBA(imageData, positionInImage)[3] !== 0;
            });
        }
        const item = items[items.length - 1];
        if (item) {
            index = item.index;
        }

        this.state.items.forEach((item, i) => {
            if (item.index === index) {
                index = i;
            }
        });

        return index;
    }

    onContainerTap(e) {
        // console.log(e.data.global);
        const index = this.getTargetIndex(e);

        if (index !== null) {
            this.onTap(e, index)
        }
    }

    onContainerDragStart(e) {
        const draggingItemIndex = this.getTargetIndex(e);

        this.setState({draggingItemIndex});
    }

    onTap(e, index) {
        const items = [...this.state.items];
        const item = items[index];
        const itemDragData = item._dragData_;
        itemDragData.tapCount++;
        itemDragData.rotation = itemDragData.tapCount * item.phase;

        this.setState({
            items
        }, () => {
            this.calculatePosition(index);
        });
    }

    onDrag(e) {
        const index = this.state.draggingItemIndex;
        if (index === null) {
            return;
        }
        const items = [...this.state.items];
        const itemDragData = items[index]._dragData_;
        const deltaX = e.data.originalEvent.deltaX + itemDragData.lastDragDeltaX;
        const deltaY = e.data.originalEvent.deltaY + itemDragData.lastDragDeltaY;
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

    onDragEnd(e) {
        const index = this.state.draggingItemIndex;
        if (index === null) {
            return;
        }
        const items = [...this.state.items];
        const itemDragData = items[index]._dragData_;
        items[index]._dragData_ = {
            ...itemDragData,
            lastDragDeltaX: e.data.originalEvent.deltaX + itemDragData.lastDragDeltaX,
            lastDragDeltaY: e.data.originalEvent.deltaY + itemDragData.lastDragDeltaY,
        };

        this.setState({
            items,
            draggingItemIndex: null,
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
        const stageWidth = bgWidth / 2;
        const stageHeight = bgHeight / 2;

        return <Stage
            options={OPTIONS}
            width={width}
            height={height}
            ref={ref => this.stage = ref}
        >
            <Sprite image={background}/>
            <DraggableContainer
                ref={this.draggableContainer}
                onPointerUp={e => this.onContainerTap(e)}
                onDragStart={e => this.onContainerDragStart(e)}
                onDragMove={e => this.onDrag(e)}
                onDragEnd={e => this.onDragEnd(e)}
            >
                {
                    items.map((item) => {
                        const {
                            image,
                            _dragData_: {rotation, x, y}
                        } = item;
                        return <Sprite
                            key={item.index}
                            image={image}
                            rotation={rotation / 360 * Math.PI * 2}
                            x={x}
                            y={y}
                        />
                    })
                }
            </DraggableContainer>
            {
                isPreview ? adsorbPoints.map(({x, y}, index) => {
                    return <Circle key={index} x={x} y={y} radius={4} fill={0xff4455}/>
                }) : null
            }
        </Stage>
    }
}

export default PIXIVersion;
