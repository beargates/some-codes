import React, {Component} from 'react';
import {Stage} from 'react-pixi-fiber';
import DraggableContainer from './components/DraggableContainer';
import Sprite from './components/Sprite';
import Circle from './components/Circle';
import Rect from './components/Rect';
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

        this.init = this.init.bind(this);
        this.goToEnd = this.goToEnd.bind(this);
        this.calculatePosition = this.calculatePosition.bind(this);
    }

    componentDidMount() {
        this.state.items.forEach(item => this.getImageData(item.image));
        this.stage._canvas.style.width = `${this.props.width}px`;
        this.stage._canvas.style.height = `${this.props.height}px`;

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
            answer,
            imageData: {},
        };
    }

    componentWillReceiveProps(props) {
        this.setState({
            ...this.mapPropsToState(props),
        }, () => {
            this.state.items.forEach(item => this.getImageData(item.image));
            this.init();
        });
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

        let real = {
            x: item._dragData_.x,
            y: item._dragData_.y,
        };
        let center = {
            x: real.x + width / 4,
            y: real.y + height / 4
        };
        let adsorb = null;
        let adsorbIndex = null;
        // 吸附点
        const {adsorbPoints: adsorbs} = this.state;
        const distances = adsorbs.map(point => Util.distance(point, center));
        const validDistances = distances.filter(distance => distance <= 30);
        if (validDistances.length) {
            const {_dragData_} = items[itemIndex];
            adsorb = adsorbs[distances.indexOf(Math.min(...validDistances))];
            adsorbIndex = adsorb.index;
            items[itemIndex]._dragData_ = {
                ..._dragData_,
                x: adsorb.x - width / 4,
                y: adsorb.y - height / 4,
                lastDragDeltaX: _dragData_.lastDragDeltaX + adsorb.x - center.x, // 吸附产生的delta
                lastDragDeltaY: _dragData_.lastDragDeltaY + adsorb.y - center.y,
            };
            center = adsorb;
        }
        items[itemIndex]._dragData_.adsorbIndex = adsorbIndex;

        this.setState({items});
    }

    /**
     * 使指定item在数组最后一位（后渲染的item出现在最顶层）
     * @param index
     * @returns {*}
     */
    goToEnd(index) {
        const items = this.state.items.filter((item, i) => i !== index);
        items.push(this.state.items[index]);
        return items;
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
        const items = this.goToEnd(draggingItemIndex);

        this.setState({
            draggingItemIndex: items.length - 1,
            items,
        });
    }

    onTap(e, index) {
        const items = this.goToEnd(index);
        const item = items[items.length - 1];
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
            {
                isPreview ? virtualTargetAreas.map((item, index) => {
                    const {width, high: height, x, y} = item;

                    return <Rect
                        key={index}
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        fill={0x0000ff}
                        alpha={.2}
                    />;
                }) : null
            }
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
