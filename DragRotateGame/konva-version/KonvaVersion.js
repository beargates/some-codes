import React, {Component} from "react";
import {Layer} from 'react-konva';
import Container from "./components/Container";
import KonvaImage from './components/KonvaImage';

import '../style.less';

export default class PIXIVersion extends Component {
    constructor(props) {
        super(props);

        this.state = {
            ...this.mapPropsToState(props),
        };
    }
    $layer = React.createRef();
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
            answer
        };
    }

    componentWillReceiveProps(props) {
        this.setState({
            ...this.mapPropsToState(props),
        });
    }
    componentDidMount () {
        setInterval(() => {
            console.log('refresh layer');
            this.$layer.current.draw();
        }, 3000);
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

    onTap(e, index) {
        const items = [...this.state.items];
        const item = items[index];
        const itemDragData = item._dragData_;
        itemDragData.tapCount++;
        itemDragData.rotation = itemDragData.tapCount * item.phase;
        console.log(e.target.getLayer() === this.$layer.current);
        // e.target.rotation(itemDragData.rotation);
        // e.target.getLayer().draw();

        this.setState({
            items
        }, () => {
            // this.calculatePosition(index);
        });
    }

    onDrag(e, index) {
        console.log('ondrag');
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
        // console.log(this.props.items[index].origin.x + deltaX, this.props.items[index].origin.y + deltaY)

        this.setState({
            items
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
        } = this.state;
        const {
            meta: {
                width: bgWidth,
                height: bgHeight,
            }
        } = background;
        return <Container
            className="game-drag-rotate"
            width={width}
            height={height}
            style={{
                backgroundImage: `url(${background.url})`,
                backgroundSize: 'contain',
                width: bgWidth / 2,
                height: bgHeight / 2,
            }}
        >
            <Layer ref={this.$layer}>
                {
                    items.map((item, index) => {
                        const {
                            image,
                            _dragData_: {rotation, x, y}
                        } = item;
                        const _this = this;
                        console.log('rotation', rotation);
                        return <KonvaImage
                            key={index}
                            image={image}
                            draggable
                            offset={{x: 20, y: 20}}
                            rotation={rotation}
                            x={x}
                            y={y}
                            onClick={function (e) {
                                _this.onTap(e, index)
                            }}
                            onDragMove={e => this.onDrag(e, index)}
                            // onDragEnd={e => this.onDragEnd(e, index)}
                        />
                    })
                }
            </Layer>
        </Container>
    }
}