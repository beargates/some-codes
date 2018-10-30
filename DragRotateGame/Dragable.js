import React from 'react';
import PropTypes from 'prop-types';

import ImageOutliner from '../../../vendor/ImageOutliner';
import Hammer from '../../component/Hammer';

const genPathString = (points) => {
    if (!points || points.length <= 1) {
        return '';
    }

    return points.reduce((ret, {x, y}, i) => {
        if (i == 0) {
            return `M${x} ${y}`;
        }

        return `${ret} L${x} ${y}`;
    }, '') + ' Z';
};

const getOutline = ({ blob: {url}, meta: { width, height } }) => {
    return new Promise((res) => {
        let image = new window.Image();

        image.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            width = Math.round(width / 2);
            height = Math.round(height / 2);

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(image, 0, 0, width, height);
            const {
                data
            } = ctx.getImageData(0, 0, width, height);
            const outline = ImageOutliner(width, height, data);

            res(outline);
        };

        image.src = url;
    });
};

export default class Dragable extends React.Component {
    static propTypes = {
        children: PropTypes.node,
        className: PropTypes.string,
        style: PropTypes.object,
        onDrag: PropTypes.func,
        onDragStart: PropTypes.func,
        onDragEnd: PropTypes.func
    }
    static defaultProps = {
        onDrag: () => {},
        onDragStart: () => {},
        onDragEnd: () => {},
        className: '',
        children: null,
        style: {}
    }
    state = {}
    componentDidMount () {
        let {
            image: {
                meta: { width, height }
            }
        } = this.props;
        let image = this.props.image;
        getOutline(image)
            .then((outline) => {
                if (image == this.props.image) {
                    this.setState({ outline });
                }
            });

        this.setState({
            width: Math.round(width / 2),
            height: Math.round(height / 2)
        });
    }
    componentWillReceiveProps (nextProps) {
        if (this.props.image != nextProps.image) {
            let image = nextProps.image;
            getOutline(image)
                .then((outline) => {
                    if (this.props.image == image) {
                        this.setState({ outline });
                    }
                });
            this.setState({
                outline: null,
                width: Math.round(nextProps.image.meta.width / 2),
                height: Math.round(nextProps.image.meta.height / 2)
            });
        }
    }
    onPan (e) {
        this.props.onDrag(e);
        e.preventDefault();
    }
    onPanStart (e) {
        this.props.onDragStart(e);
        e.preventDefault();
    }
    onPanEnd (e) {
        this.props.onDragEnd(e);
        e.preventDefault();
    }
    onTap (e) {
        this.props.onTap(e);
    }
    render() {
        const { style, className } = this.props;
        const { outline } = this.state;

        return <Hammer
            onTap={ this.onTap.bind(this) }
            onPan={ this.onPan.bind(this) }
            onPanEnd={ this.onPanEnd.bind(this) }
            onPanStart={ this.onPanStart.bind(this) }
            direction="DIRECTION_ALL"
        >
            <path
                className={ className }
                d={genPathString(outline)}
                style={{
                    ...style
                }}
            />
        </Hammer>;
    }
}